import { pollUntil } from "./poll.js";

export interface RecordedWebhook {
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
}

function sinkUrl(): string {
  return process.env.WEBHOOK_SINK_URL ?? "http://localhost:8026";
}

async function fetchSink(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${sinkUrl()}${path}`, {
    ...options,
    headers: { ...options?.headers, accept: "application/json" }
  });
}

/** Return all webhooks recorded since the last clear. */
export async function listWebhooks(): Promise<RecordedWebhook[]> {
  const response = await fetchSink("/_list");
  return (await response.json()) as RecordedWebhook[];
}

/** Discard all recorded webhooks. Call this before triggering a new event. */
export async function clearWebhooks(): Promise<void> {
  await fetchSink("/_clear", { method: "POST" });
}

/**
 * Poll the sink until at least one recorded request matches `predicate`.
 * Returns the first matching request.
 */
export async function waitForWebhook(
  predicate: (req: RecordedWebhook) => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<RecordedWebhook> {
  const result = await pollUntil(
    async () => {
      const all = await listWebhooks();
      return all.find(predicate) ?? null;
    },
    (found) => found !== null,
    { timeoutMs: options.timeoutMs ?? 30_000, intervalMs: options.intervalMs ?? 1_000 }
  );
  return result as unknown as RecordedWebhook;
}
