import { describe, expect, it } from "vitest";
import { CursorCodec } from "../src/cursor.js";
import { ResponsePaginator } from "../src/pagination.js";
import type { RegisteredOperation } from "../src/types.js";

const operation: RegisteredOperation = {
  operationId: "jira.issue.search",
  product: "jira",
  summary: "Search",
  method: "GET",
  path: "/rest/api/2/search",
  responseKind: "json",
  pagination: {
    kind: "jira",
    requestOffset: "startAt",
    requestLimit: "maxResults",
    responseItems: "issues",
    responseTotal: "total"
  },
  tags: ["issue"],
  scope: "global",
  dataKind: "resource",
  destructive: false
};

describe("two-layer response pagination", () => {
  it("caps output and returns an opaque continuation without skipping items", () => {
    const paginator = new ResponsePaginator(new CursorCodec(900, Buffer.alloc(32, 4)));
    const rawData = {
      issues: Array.from({ length: 10 }, (_, index) => ({
        id: String(index),
        key: `ABC-${index}`,
        summary: "x".repeat(150)
      })),
      total: 10
    };
    const identity = { jql: "project = ABC", pageSize: 10 };
    const first = paginator.paginate({
      operation,
      rawData,
      responseOptions: {
        pageSize: 10,
        responseProfile: "standard",
        maxOutputBytes: 1800
      },
      requestIdentity: identity,
      upstreamOffset: 0,
      upstreamLimit: 10,
      maxOutputBytes: 1800
    });

    expect(first.meta.responseBytes).toBeLessThanOrEqual(1800);
    expect(first.page.hasMore).toBe(true);
    expect(first.page.nextCursor).toBeTruthy();

    const state = paginator.requestState(operation, identity, first.page.nextCursor);
    expect(state.upstreamOffset).toBe(0);
    expect(state.localOffset).toBeGreaterThan(0);

    const second = paginator.paginate({
      operation,
      rawData,
      responseOptions: {
        cursor: first.page.nextCursor,
        pageSize: 10,
        responseProfile: "standard",
        maxOutputBytes: 1800
      },
      requestIdentity: identity,
      upstreamOffset: state.upstreamOffset,
      upstreamLimit: 10,
      maxOutputBytes: 1800
    });
    const firstIds = (first.data as Array<{ id: string }>).map((item) => item.id);
    const secondIds = (second.data as Array<{ id: string }>).map((item) => item.id);
    expect(firstIds.filter((id) => secondIds.includes(id))).toEqual([]);
  });

  it("chunks a single oversized string by UTF-8 bytes", () => {
    const paginator = new ResponsePaginator(new CursorCodec(900, Buffer.alloc(32, 8)));
    const objectOperation: RegisteredOperation = {
      ...operation,
      operationId: "jira.issue.get",
      pagination: undefined
    };
    const identity = { issueKey: "ABC-1" };
    const response = paginator.paginate({
      operation: objectOperation,
      rawData: { id: "1", description: "企业字段".repeat(2000) },
      responseOptions: {
        responseProfile: "full",
        maxOutputBytes: 2048
      },
      requestIdentity: identity,
      upstreamOffset: 0,
      upstreamLimit: 25,
      maxOutputBytes: 2048
    });

    expect(response.meta.responseBytes).toBeLessThanOrEqual(2048);
    expect(response.page.mode).toBe("fields");
    expect(response.page.hasMore).toBe(true);
    expect(response.page.nextCursor).toBeTruthy();
  });

  it("rejects a cursor used with different request parameters", () => {
    const paginator = new ResponsePaginator(new CursorCodec(900, Buffer.alloc(32, 2)));
    const cursor = paginator.paginate({
      operation,
      rawData: {
        issues: Array.from({ length: 10 }, (_, id) => ({ id })),
        total: 20
      },
      responseOptions: { pageSize: 10 },
      requestIdentity: { jql: "project = A" },
      upstreamOffset: 0,
      upstreamLimit: 10,
      maxOutputBytes: 2048
    }).page.nextCursor;

    expect(() => paginator.requestState(operation, { jql: "project = B" }, cursor)).toThrow(
      /does not match/
    );
  });

  it("rejects a non-integer string upstream offset instead of parsing a prefix", () => {
    const paginator = new ResponsePaginator(new CursorCodec(900, Buffer.alloc(32, 6)));
    expect(() =>
      paginator.paginate({
        operation,
        rawData: { issues: [{ id: "1" }], total: 5 },
        responseOptions: { pageSize: 10 },
        requestIdentity: { jql: "project = A" },
        upstreamOffset: "123abc",
        upstreamLimit: 10,
        maxOutputBytes: 2048
      })
    ).toThrow(/Invalid cursor offset/);
  });
});
