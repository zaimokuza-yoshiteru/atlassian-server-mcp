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
