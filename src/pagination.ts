import { CursorCodec } from "./cursor.js";
import { flattenJson, getByPath, hashRequest, parseStrictInteger, utf8Bytes } from "./json.js";
import { projectResponse } from "./projection.js";
import type { CommonResponseOptions, PaginationSpec, Product, UnifiedResponse } from "./types.js";

export interface ResponseOperationDescriptor {
  operationId: string;
  product: Product;
  pagination?: PaginationSpec;
}

interface PageInput {
  operation: ResponseOperationDescriptor;
  rawData: unknown;
  responseOptions: CommonResponseOptions;
  requestIdentity: unknown;
  upstreamOffset: number | string;
  upstreamLimit: number;
  maxOutputBytes: number;
}

export interface PaginationRequestState {
  requestHash: string;
  upstreamOffset: number | string;
  localOffset: number;
  mode: "items" | "fields";
}

export class ResponsePaginator {
  readonly #cursorCodec: CursorCodec;

  constructor(cursorCodec: CursorCodec) {
    this.#cursorCodec = cursorCodec;
  }

  requestState(
    operation: ResponseOperationDescriptor,
    requestIdentity: unknown,
    cursor?: string
  ): PaginationRequestState {
    const requestHash = hashRequest(requestIdentity);
    if (!cursor) {
      return {
        requestHash,
        upstreamOffset: 0,
        localOffset: 0,
        mode: "items"
      };
    }
    const payload = this.#cursorCodec.decode(cursor);
    if (payload.operationId !== operation.operationId || payload.requestHash !== requestHash) {
      throw new Error("Cursor does not match this operation or request");
    }
    return {
      requestHash,
      upstreamOffset: payload.upstreamOffset,
      localOffset: payload.localOffset,
      mode: payload.mode
    };
  }

  paginate(input: PageInput): UnifiedResponse {
    const profile = input.responseOptions.responseProfile ?? "compact";
    const budget = Math.min(
      input.maxOutputBytes,
      input.responseOptions.maxOutputBytes ?? input.maxOutputBytes
    );
    const requestHash = hashRequest(input.requestIdentity);
    const cursorPayload = input.responseOptions.cursor
      ? this.#cursorCodec.decode(input.responseOptions.cursor)
      : undefined;
    const localOffset = cursorPayload?.localOffset ?? 0;

    const pagination = input.operation.pagination;
    const extracted = pagination
      ? getByPath(input.rawData, pagination.responseItems)
      : input.rawData;
    const projected = projectResponse(
      extracted,
      input.operation.product,
      profile,
      input.responseOptions.fields
    );

    const items = Array.isArray(projected.data) ? projected.data : undefined;
    const overhead = 1400;
    const dataBudget = Math.max(256, budget - overhead);

    let data: unknown;
    let returned: number;
    let mode: "items" | "fields";
    let localHasMore: boolean;
    let nextLocalOffset: number;

    if (items && items.every((item) => utf8Bytes(item) <= dataBudget)) {
      mode = "items";
      const page = takeWithinBudget(items, localOffset, dataBudget);
      data = page.values;
      returned = page.values.length;
      localHasMore = page.nextOffset < items.length;
      nextLocalOffset = page.nextOffset;
    } else {
      mode = "fields";
      const leaves = chunkOversizedLeaves(
        flattenJson(projected.data),
        Math.max(128, Math.floor(dataBudget * 0.75))
      );
      const page = takeWithinBudget(leaves, localOffset, dataBudget);
      data = { $fragment: page.values };
      returned = page.values.length;
      localHasMore = page.nextOffset < leaves.length;
      nextLocalOffset = page.nextOffset;
    }

    const upstream = determineUpstreamContinuation(
      input.operation,
      input.rawData,
      input.upstreamOffset,
      input.upstreamLimit
    );
    const hasMore = localHasMore || upstream.hasMore;
    const nextCursor = hasMore
      ? this.#cursorCodec.encode({
          operationId: input.operation.operationId,
          requestHash,
          upstreamOffset: localHasMore ? input.upstreamOffset : upstream.nextOffset,
          localOffset: localHasMore ? nextLocalOffset : 0,
          mode: localHasMore ? mode : "items"
        })
      : undefined;

    const response: UnifiedResponse = {
      data,
      page: {
        mode,
        returned,
        hasMore,
        ...(nextCursor ? { nextCursor } : {})
      },
      meta: {
        product: input.operation.product,
        operationId: input.operation.operationId,
        responseProfile: profile,
        responseBytes: 0,
        truncated: projected.omittedPaths.length > 0 || hasMore,
        ...(projected.omittedPaths.length > 0 ? { omittedPaths: projected.omittedPaths } : {})
      }
    };
    response.meta.responseBytes = utf8Bytes(response);

    if (response.meta.responseBytes > budget) {
      return shrinkResponse(response, budget, input.operation.product);
    }
    return response;
  }
}

function chunkOversizedLeaves(
  leaves: readonly { path: string; value: unknown }[],
  maxBytes: number
): Array<{ path: string; value: unknown }> {
  return leaves.flatMap((leaf) => {
    if (typeof leaf.value !== "string" || utf8Bytes(leaf) <= maxBytes) {
      return [leaf];
    }
    const chunks = splitStringByUtf8Bytes(leaf.value, Math.max(32, maxBytes - 100));
    return chunks.map((value, index) => ({
      path: `${leaf.path}#chunk=${index + 1}/${chunks.length}`,
      value
    }));
  });
}

function splitStringByUtf8Bytes(value: string, maxBytes: number): string[] {
  const output: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const character of value) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    if (current && currentBytes + characterBytes > maxBytes) {
      output.push(current);
      current = character;
      currentBytes = characterBytes;
    } else {
      current += character;
      currentBytes += characterBytes;
    }
  }
  if (current || output.length === 0) output.push(current);
  return output;
}

function takeWithinBudget<T>(
  values: readonly T[],
  offset: number,
  budget: number
): { values: T[]; nextOffset: number } {
  const output: T[] = [];
  let used = 2;
  let index = offset;
  while (index < values.length) {
    const value = values[index];
    const bytes = utf8Bytes(value) + (output.length > 0 ? 1 : 0);
    if (output.length > 0 && used + bytes > budget) break;
    if (value !== undefined) output.push(value);
    used += bytes;
    index += 1;
    if (used >= budget) break;
  }
  return { values: output, nextOffset: index };
}

function determineUpstreamContinuation(
  operation: ResponseOperationDescriptor,
  rawData: unknown,
  offset: number | string,
  limit: number
): { hasMore: boolean; nextOffset: number | string } {
  const spec = operation.pagination;
  if (!spec) return { hasMore: false, nextOffset: offset };
  if (spec.kind === "bitbucket") {
    const isLast = Boolean(getByPath(rawData, spec.responseIsLast ?? "isLastPage"));
    const next = getByPath(rawData, spec.responseNextOffset ?? "nextPageStart");
    return {
      hasMore: !isLast && (typeof next === "number" || typeof next === "string"),
      nextOffset: typeof next === "number" || typeof next === "string" ? next : offset
    };
  }

  const items = getByPath(rawData, spec.responseItems);
  const count = Array.isArray(items) ? items.length : 0;
  const numericOffset = typeof offset === "number" ? offset : parseStrictInteger(offset);
  if (numericOffset === undefined) {
    throw new Error("Invalid cursor offset");
  }
  const total = spec.responseTotal ? Number(getByPath(rawData, spec.responseTotal)) : Number.NaN;
  const hasMore = Number.isFinite(total) ? numericOffset + count < total : count >= limit;
  return { hasMore, nextOffset: numericOffset + count };
}

function shrinkResponse(
  response: UnifiedResponse,
  budget: number,
  product: Product
): UnifiedResponse {
  const minimal: UnifiedResponse = {
    data: {
      error: "A single response fragment exceeds the configured output budget",
      advice: "Use responseProfile=compact or request fewer fields"
    },
    page: response.page,
    meta: {
      product,
      operationId: response.meta.operationId,
      responseProfile: response.meta.responseProfile,
      responseBytes: 0,
      truncated: true
    }
  };
  minimal.meta.responseBytes = utf8Bytes(minimal);
  if (minimal.meta.responseBytes > budget) {
    throw new Error("maxOutputBytes is too small for the response envelope");
  }
  return minimal;
}
