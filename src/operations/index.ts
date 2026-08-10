import type { RegisteredOperation } from "../types.js";
import { jiraOperations } from "./jira.js";
import { confluenceOperations } from "./confluence.js";
import { bitbucketOperations } from "./bitbucket.js";
import { POLICY_OPERATIONS as POLICY_IDS } from "../exposure-policy.js";
import { policyRequiredTier } from "../exposure-policy.js";
import type { ExposureTier } from "../types.js";

export const RAW_OPERATIONS: readonly RegisteredOperation[] = [
  ...jiraOperations,
  ...confluenceOperations,
  ...bitbucketOperations
];

export const POLICY_OPERATIONS: readonly (RegisteredOperation & { requiredTier: ExposureTier })[] = RAW_OPERATIONS
  .filter((operation) => POLICY_IDS.includes(operation.operationId))
  .map((operation) => ({ ...operation, requiredTier: policyRequiredTier(operation) }));
export function operationById(operationId: string): RegisteredOperation | undefined {
  return RAW_OPERATIONS.find((operation) => operation.operationId === operationId);
}
