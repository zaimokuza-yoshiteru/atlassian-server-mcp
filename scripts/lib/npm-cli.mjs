// Locate the npm CLI entry point so it can be executed with the current
// Node binary. Spawning "npm" directly fails on Windows: npm is npm.cmd
// there, and modern Node refuses to spawn .cmd shims without shell:true.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

let cached;

export function npmCliPath() {
  if (cached) return cached;
  const nodeDir = dirname(process.execPath);
  const candidates =
    process.platform === "win32"
      ? [join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js")]
      : [join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js")];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cached = candidate;
      return cached;
    }
  }
  throw new Error(`cannot locate npm-cli.js next to ${process.execPath}`);
}

/** Prepend the npm CLI to an argument list: run(process.execPath, npmArgs([...])). */
export function npmArgs(args) {
  return [npmCliPath(), ...args];
}
