import { recordCleanup } from "./cleanup-journal.js";

/**
 * Run `mutate`, and restore the original state in `finally` via `restore`.
 *
 * Designed for global-side-effect operations (e.g. Jira default share scope,
 * Confluence anonymous permissions, Bitbucket project settings). The `read`
 * callback captures the current value before mutation; `restore` writes it
 * back afterwards.
 *
 * If `restore` throws the error is journaled as `cleanup-failed` and then
 * re-thrown so the test fails — the environment is dirty and subsequent
 * results are unreliable.
 */
export async function withRestoredState<T>(
  read: () => Promise<T>,
  restore: (original: T) => Promise<void>,
  mutate: () => Promise<void>
): Promise<void> {
  const original = await read();
  try {
    await mutate();
  } finally {
    try {
      await restore(original);
    } catch (error) {
      recordCleanup("global", "state", "restore-failed", "cleanup-failed", { error });
      throw error;
    }
  }
}
