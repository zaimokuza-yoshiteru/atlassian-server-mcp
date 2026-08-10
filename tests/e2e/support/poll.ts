/**
 * Poll `fn` until `predicate` returns truthy, or the timeout expires.
 *
 * Used for async operations whose completion is observable only through
 * repeated querying (Jira archive/restore, mailpit delivery, Bitbucket
 * webhook statistics, Confluence text extraction).
 */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const intervalMs = options.intervalMs ?? 1_000;
  const deadline = Date.now() + timeoutMs;
  let lastValue: T;
  for (;;) {
    lastValue = await fn();
    if (predicate(lastValue)) return lastValue;
    if (Date.now() >= deadline) {
      throw new Error(
        `pollUntil timed out after ${timeoutMs}ms. ` +
          `Last value: ${JSON.stringify(lastValue).slice(0, 500)}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
