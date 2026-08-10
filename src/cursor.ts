import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CursorPayload } from "./types.js";

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

export class CursorCodec {
  readonly #secret: Buffer;
  readonly #ttlSeconds: number;

  constructor(ttlSeconds: number, secret: Buffer = randomBytes(32)) {
    this.#ttlSeconds = ttlSeconds;
    this.#secret = secret;
  }

  encode(payload: Omit<CursorPayload, "version" | "expiresAt">, now = Date.now()): string {
    const complete: CursorPayload = {
      ...payload,
      version: 1,
      expiresAt: now + this.#ttlSeconds * 1000
    };
    const body = base64UrlEncode(JSON.stringify(complete));
    return `${body}.${this.#sign(body)}`;
  }

  decode(token: string, now = Date.now()): CursorPayload {
    const [body, suppliedSignature, extra] = token.split(".");
    if (!body || !suppliedSignature || extra !== undefined) {
      throw new Error("Invalid cursor");
    }
    const expectedSignature = this.#sign(body);
    const expected = Buffer.from(expectedSignature);
    const supplied = Buffer.from(suppliedSignature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      throw new Error("Invalid cursor signature");
    }

    let payload: CursorPayload;
    try {
      payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CursorPayload;
    } catch {
      throw new Error("Invalid cursor payload");
    }
    if (payload.version !== 1 || payload.expiresAt <= now) {
      throw new Error("Cursor has expired");
    }
    return payload;
  }

  #sign(body: string): string {
    return createHmac("sha256", this.#secret).update(body).digest("base64url");
  }
}
