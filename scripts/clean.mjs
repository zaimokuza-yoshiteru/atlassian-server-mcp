// Cross-platform clean: removes ONLY this project's dist/ directory.
// The path is hardcoded relative to this script so it can never be pointed
// at an arbitrary directory.
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(root, "dist");

if (!distDir.endsWith(`${process.platform === "win32" ? "\\" : "/"}dist`)) {
  throw new Error(`refusing to remove unexpected path: ${distDir}`);
}

rmSync(distDir, { recursive: true, force: true });
console.log(`clean: removed ${distDir}`);
