import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Seed a Bitbucket repository with commits and branches via git-over-HTTP.
 *
 * Uses Bearer token + http.extraHeader for authentication (PAT scope covers
 * all project/repo-level git operations; tokens containing `:` cannot be
 * URL-embedded — git would parse them as host:port).
 *
 * Creates a temporary clone directory that is cleaned up in `finally`.
 *
 * @returns commit SHAs and branch names for E2E assertions.
 */
export async function seedRepository(
  projectKey: string,
  repositorySlug: string,
  options: {
    /** Sequential commits on the base branch. Each entry = one commit.
     *  `files` maps file path → content. */
    commits?: Array<{ message: string; files: Record<string, string> }>;
    /** Extra branches to create (branched from the last commit on base). */
    branches?: string[];
    /** Base branch name (default "main"). Created on first push. */
    baseBranch?: string;
  } = {}
): Promise<{ commits: string[]; branches: string[] }> {
  const token = process.env.BITBUCKET_TOKEN;
  if (!token) throw new Error("BITBUCKET_TOKEN is required for git fixture");

  const baseUrl = process.env.BITBUCKET_URL ?? "http://localhost:7990";
  const base = options.baseBranch ?? "main";
  const commits: string[] = [];
  const branches: string[] = [];

  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/scm/${projectKey.toLowerCase()}/${repositorySlug}.git`;

  const directory = await mkdtemp(join(tmpdir(), "atlassian-mcp-git-fixture-"));
  const git = async (...args: string[]) =>
    execFileAsync("git", ["-c", `http.extraHeader=Authorization: Bearer ${token}`, ...args], {
      cwd: directory,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }
    });

  try {
    // Clone
    await git("clone", "-q", url.toString(), directory);
    await git("config", "user.name", "MCP E2E");
    await git("config", "user.email", "mcp-e2e@163.com");

    // Optional: switch to the target base branch if different from remote HEAD
    const baseBranch = options.baseBranch ?? "main";
    const branchesOutput = await git("branch", "-a");
    if (!branchesOutput.stdout.includes(baseBranch)) {
      await git("checkout", "-q", "-b", baseBranch);
    } else {
      await git("checkout", "-q", baseBranch);
    }

    // Apply commits
    for (const c of options.commits ?? []) {
      for (const [filePath, content] of Object.entries(c.files)) {
        const fullPath = join(directory, filePath);
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content, "utf8");
        await git("add", filePath);
      }
      await git("commit", "-q", "-m", c.message);
      const sha = (await git("rev-parse", "HEAD")).stdout.trim();
      commits.push(sha);
    }

    // Push base branch
    await git("push", "-q", "-u", "origin", base);

    // Create extra branches (from HEAD) and push
    for (const branch of options.branches ?? []) {
      await git("checkout", "-q", "-b", branch);
      await git("push", "-q", "-u", "origin", branch);
      branches.push(branch);
    }

    // Switch back to base before returning
    await git("checkout", "-q", base);

    return { commits, branches };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
