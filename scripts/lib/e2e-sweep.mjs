// Deterministic Confluence content cleanup.  The request and journal hooks are
// injected so this state machine can be tested without a live Data Center.
export async function sweepConfluenceContent({
  id,
  request,
  recordCleaned,
  maxPolls = 8,
  pollDelayMs = 50,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
}) {
  const lookup = `/rest/api/content/${encodeURIComponent(id)}?status=any`;
  const purge = `/rest/api/content/${encodeURIComponent(id)}?status=trashed`;
  const get = async () => request(lookup, { method: "GET" });
  const remove = async (path) => {
    const result = await request(path, { method: "DELETE" });
    if (result.status >= 400 && result.status !== 404)
      throw new Error(`HTTP ${result.status}: ${result.text ?? ""}`);
    return result;
  };
  const waitFor = async (expected) => {
    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      const result = await get();
      if (expected === "gone" && result.status === 404) return result;
      if (expected === "trashed" && result.status === 200 && result.data?.status === "trashed")
        return result;
      if (attempt + 1 < maxPolls) await sleep(pollDelayMs * 2 ** Math.min(attempt, 4));
    }
    throw new Error(`Timed out waiting for Confluence content ${id} to become ${expected}`);
  };
  const first = await get();
  if (first.status === 404) {
    recordCleaned();
    return;
  }
  if (first.status !== 200) throw new Error(`GET content failed with HTTP ${first.status}`);
  const status = first.data?.status;
  if (status === "current") await remove(`/rest/api/content/${encodeURIComponent(id)}`);
  else if (status !== "trashed") throw new Error(`Unexpected content status: ${String(status)}`);
  const afterTrash = await waitFor("trashed");
  if (afterTrash.status === 404) {
    recordCleaned();
    return;
  }
  await remove(purge);
  await waitFor("gone");
  recordCleaned();
}
