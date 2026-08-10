import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let journal: string | undefined;

function journalPath(): string {
  if (!journal) {
    journal = resolve(process.env.E2E_CLEANUP_JOURNAL ?? ".e2e-state/cleanup-journal.jsonl");
  }
  return journal;
}

export function recordCleanup(
  product: string,
  resource: string,
  id: string,
  status: "created" | "cleaned" | "cleanup-failed",
  opts?: { error?: unknown; runId?: string; cleanupEndpoint?: string }
): void {
  const path = journalPath();
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(
    path,
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      product,
      resource,
      id,
      status,
      ...(opts?.runId ? { runId: opts.runId } : {}),
      ...(opts?.cleanupEndpoint ? { cleanupEndpoint: opts.cleanupEndpoint } : {}),
      ...(opts?.error
        ? { error: opts.error instanceof Error ? opts.error.message : String(opts.error) }
        : {})
    })}\n`,
    { mode: 0o600 }
  );
}
