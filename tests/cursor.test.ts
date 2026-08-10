import { describe, expect, it } from "vitest";
import { CursorCodec } from "../src/cursor.js";

const payload = {
  operationId: "jira.issue.search",
  requestHash: "hash",
  upstreamOffset: 25,
  localOffset: 3,
  mode: "items" as const
};

describe("opaque cursors", () => {
  it("round-trips a signed cursor", () => {
    const codec = new CursorCodec(900, Buffer.alloc(32, 7));
    const token = codec.encode(payload, 1000);
    expect(codec.decode(token, 2000)).toMatchObject(payload);
  });

  it("rejects tampering", () => {
    const codec = new CursorCodec(900, Buffer.alloc(32, 7));
    const token = codec.encode(payload, 1000);
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(() => codec.decode(tampered, 2000)).toThrow(/signature/);
  });

  it("rejects expired cursors", () => {
    const codec = new CursorCodec(1, Buffer.alloc(32, 7));
    const token = codec.encode(payload, 1000);
    expect(() => codec.decode(token, 2001)).toThrow(/expired/);
  });
});
