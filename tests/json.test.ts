import { describe, expect, it } from "vitest";
import {
  asRecord,
  flattenJson,
  getByPath,
  hashRequest,
  parseStrictInteger,
  setByPath,
  stableStringify,
  stripTrailingSlashes,
  utf8Bytes
} from "../src/json.js";

describe("flattenJson", () => {
  it("flattens array elements with indexed paths", () => {
    expect(flattenJson(["a", "b"])).toEqual([
      { path: "$[0]", value: "a" },
      { path: "$[1]", value: "b" }
    ]);
  });

  it("keeps an empty array as a single leaf", () => {
    expect(flattenJson([])).toEqual([{ path: "$", value: [] }]);
  });

  it("flattens nested arrays inside objects with sorted keys", () => {
    expect(flattenJson({ b: [1, { c: 2 }], a: "x" })).toEqual([
      { path: "$.a", value: "x" },
      { path: "$.b[0]", value: 1 },
      { path: "$.b[1].c", value: 2 }
    ]);
  });

  it("keeps empty objects and primitives as leaves", () => {
    expect(flattenJson({})).toEqual([{ path: "$", value: {} }]);
    expect(flattenJson(null)).toEqual([{ path: "$", value: null }]);
    expect(flattenJson(7, "root")).toEqual([{ path: "root", value: 7 }]);
  });
});

describe("stableStringify / hashRequest", () => {
  it("produces key-order-independent output", () => {
    const left = { a: 1, b: { c: [3, 2], d: 4 } };
    const right = { b: { d: 4, c: [3, 2] }, a: 1 };
    expect(stableStringify(left)).toBe(stableStringify(right));
    expect(hashRequest(left)).toBe(hashRequest(right));
  });

  it("preserves array order", () => {
    expect(stableStringify([2, 1])).not.toBe(stableStringify([1, 2]));
  });
});

describe("getByPath / setByPath", () => {
  it("reads nested values and returns undefined through non-objects", () => {
    expect(getByPath({ a: { b: 1 } }, "a.b")).toBe(1);
    expect(getByPath({ a: 1 }, "a.b")).toBeUndefined();
    expect(getByPath({ a: 1 }, "")).toEqual({ a: 1 });
  });

  it("creates intermediate objects when setting", () => {
    const target: Record<string, unknown> = { a: { b: 1 } };
    setByPath(target, "a.c.d", 2);
    expect(target).toEqual({ a: { b: 1, c: { d: 2 } } });
    setByPath(target, "a.b", 3);
    expect(target).toEqual({ a: { b: 3, c: { d: 2 } } });
  });

  it("stores __proto__ paths as own properties without polluting Object.prototype", () => {
    const target: Record<string, unknown> = {};
    setByPath(target, "__proto__.polluted", "yes");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(target, "__proto__")).toBe(true);
    expect(JSON.parse(JSON.stringify(target))).toEqual(
      JSON.parse('{"__proto__":{"polluted":"yes"}}')
    );
  });

  it("stores constructor/prototype paths as own properties without touching Object.prototype", () => {
    const target: Record<string, unknown> = {};
    setByPath(target, "constructor.prototype.polluted", "yes");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(JSON.parse(JSON.stringify(target))).toEqual({
      constructor: { prototype: { polluted: "yes" } }
    });
  });
});

describe("stripTrailingSlashes", () => {
  it("removes trailing slashes in a single pass", () => {
    expect(stripTrailingSlashes("/jira/")).toBe("/jira");
    expect(stripTrailingSlashes("/jira///")).toBe("/jira");
    expect(stripTrailingSlashes("/")).toBe("");
    expect(stripTrailingSlashes("")).toBe("");
  });

  it("leaves clean and rootless paths unchanged", () => {
    expect(stripTrailingSlashes("/jira")).toBe("/jira");
    expect(stripTrailingSlashes("jira")).toBe("jira");
  });
});

describe("utf8Bytes", () => {
  it("counts multi-byte characters in UTF-8 bytes", () => {
    expect(utf8Bytes("文件")).toBe(Buffer.byteLength(JSON.stringify("文件"), "utf8"));
    expect(utf8Bytes(1)).toBe(1);
  });
});

describe("parseStrictInteger", () => {
  it("accepts plain integer literals, including zero and negatives", () => {
    expect(parseStrictInteger("0")).toBe(0);
    expect(parseStrictInteger("42")).toBe(42);
    expect(parseStrictInteger("-7")).toBe(-7);
  });

  it("rejects trailing garbage that Number.parseInt would accept", () => {
    expect(parseStrictInteger("123abc")).toBeUndefined();
  });

  it("rejects decimals", () => {
    expect(parseStrictInteger("12.5")).toBeUndefined();
  });

  it("rejects the empty string and whitespace", () => {
    expect(parseStrictInteger("")).toBeUndefined();
    expect(parseStrictInteger(" 12")).toBeUndefined();
    expect(parseStrictInteger("12 ")).toBeUndefined();
  });

  it("rejects numbers beyond the safe integer range", () => {
    expect(parseStrictInteger("99999999999999999999")).toBeUndefined();
  });
});

describe("asRecord", () => {
  it("returns plain objects as records", () => {
    const value = { a: 1 };
    expect(asRecord(value)).toBe(value);
  });

  it("rejects null, primitives, and arrays", () => {
    expect(asRecord(null)).toBeUndefined();
    expect(asRecord(undefined)).toBeUndefined();
    expect(asRecord("str")).toBeUndefined();
    expect(asRecord(7)).toBeUndefined();
    expect(asRecord([1, 2])).toBeUndefined();
  });
});
