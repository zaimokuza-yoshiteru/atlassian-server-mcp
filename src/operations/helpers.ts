import type { PaginationSpec } from "../types.js";

export const jiraPage = (items = "issues"): PaginationSpec => ({
  kind: "jira",
  requestOffset: "startAt",
  requestLimit: "maxResults",
  responseItems: items,
  responseTotal: "total"
});

export const confluencePage = (items = "results"): PaginationSpec => ({
  kind: "confluence",
  requestOffset: "start",
  requestLimit: "limit",
  responseItems: items
});

export const bitbucketPage = (items = "values"): PaginationSpec => ({
  kind: "bitbucket",
  requestOffset: "start",
  requestLimit: "limit",
  responseItems: items,
  responseNextOffset: "nextPageStart",
  responseIsLast: "isLastPage"
});

export const jiraVersions = ["10.3", "11.3"] as const;
export const confluenceVersions = ["9.2", "10.2"] as const;
export const bitbucketVersions = ["9.4", "10.2", "10.4"] as const;
