// Structured error for non-2xx upstream responses; carries sanitized details
// so service.ts can build credential-free error payloads.
export class AtlassianHttpError extends Error {
  readonly status: number;
  readonly product: string;
  readonly operationId: string;
  readonly details?: unknown;

  constructor(
    product: string,
    operationId: string,
    status: number,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "AtlassianHttpError";
    this.product = product;
    this.operationId = operationId;
    this.status = status;
    this.details = details;
  }
}

// Minimal structural view of an undici response, so this module stays free of
// transport imports and both http.ts and file-transfer.ts can share the guard.
interface RedirectResponse {
  statusCode: number;
  headers: { location?: string | string[] | undefined };
  body: { dump(): Promise<unknown> };
}

// Shared redirect guard: explicitly reject 3xx responses BEFORE the body is
// consumed. undici does not follow redirects by default, and a session-
// expired instance may 302 to a login page; without this guard the redirect
// HTML could be parsed as a result or saved to disk as a "successful"
// download. The reported location is reduced to origin + pathname so signed
// query parameters never leak into error payloads.
export async function rejectRedirectResponse(
  response: RedirectResponse,
  product: string,
  operationId: string,
  sourceUrl: URL
): Promise<void> {
  if (response.statusCode < 300 || response.statusCode >= 400) return;
  await response.body.dump();
  let safeLocation = "";
  try {
    const location = String(response.headers.location ?? "");
    if (location)
      safeLocation = new URL(location, sourceUrl).origin + new URL(location, sourceUrl).pathname;
  } catch {
    /* malformed location — omit it */
  }
  throw new AtlassianHttpError(
    product,
    operationId,
    response.statusCode,
    `${operationId} failed with HTTP ${response.statusCode}: upstream returned a redirect` +
      (safeLocation ? ` to ${safeLocation}` : "") +
      ". This usually means the session expired or the instance redirected to a login page; " +
      "this client does not follow redirects. Check credentials and instance state."
  );
}
