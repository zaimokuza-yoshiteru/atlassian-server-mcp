#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { POLICY_OPERATIONS } from "../dist/operations/index.js";
import { policyRequiredTier } from "../dist/exposure-policy.js";

const target = resolve("tests/e2e/coverage.json");
const automated = new Map(
  Object.entries({
    "jira.issue.createmeta.issuetypes.list": "jira-core-lifecycle",
    "jira.issue.create": "jira-core-lifecycle",
    "jira.issue.get": "jira-core-lifecycle",
    "jira.issue.notify": "jira-core-lifecycle",
    "jira.issue.update": "jira-core-lifecycle",
    "jira.issue.delete": "jira-core-lifecycle",
    "jira.issue.attachments.upload": "jira-attachment-lifecycle",
    "jira.issue.attachments.metadata": "jira-attachment-lifecycle",
    "jira.attachment.delete": "jira-attachment-lifecycle",
    "confluence.content.create": "confluence-core-lifecycle",
    "confluence.content.get": "confluence-core-lifecycle",
    "confluence.content.update": "confluence-core-lifecycle",
    "confluence.content.delete": "confluence-core-lifecycle",
    "confluence.attachments.upload": "confluence-attachment-lifecycle",
    "confluence.attachments.metadata": "confluence-attachment-lifecycle",
    "confluence.attachments.content.child.data.create": "confluence-attachment-lifecycle",
    "confluence.attachments.content.child.delete": "confluence-attachment-lifecycle",
    // C-A confluence-content-collaboration — 4.1 content read surface (12 ops)
    "confluence.content.children.list": "confluence-content-collaboration",
    "confluence.content.comments.list": "confluence-content-collaboration",
    "confluence.content.history": "confluence-content-collaboration",
    "confluence.content.list": "confluence-content-collaboration",
    "confluence.content.versions.list": "confluence-content-collaboration",
    "confluence.content.labels.add": "confluence-content-collaboration",
    "confluence.content.labels.list": "confluence-content-collaboration",
    "confluence.content.labels.delete": "confluence-content-collaboration",
    "confluence.content-labels.delete": "confluence-content-collaboration",
    "confluence.content.restrictions.list": "confluence-content-collaboration",
    "confluence.content.restrictions.update": "confluence-content-collaboration",
    "confluence.content-version.delete": "confluence-content-collaboration",
    // C-A confluence-content-collaboration — 4.2 properties & derived (14 ops)
    "confluence.content-property.create": "confluence-content-collaboration",
    "confluence.content-property.create.id": "confluence-content-collaboration",
    "confluence.content-property.get": "confluence-content-collaboration",
    "confluence.content-property.list": "confluence-content-collaboration",
    "confluence.content-property.update": "confluence-content-collaboration",
    "confluence.content-property.delete": "confluence-content-collaboration",
    "confluence.content-descendant.list": "confluence-content-collaboration",
    "confluence.content-descendant.get": "confluence-content-collaboration",
    "confluence.child-content.get": "confluence-content-collaboration",
    "confluence.content-resource.scan.list": "confluence-content-collaboration",
    "confluence.content-resource.search.list": "confluence-content-collaboration",
    "confluence.content-resource.history.macro.id.get": "confluence-content-collaboration",
    "confluence.content-restrictions.byoperation.get": "confluence-content-collaboration",
    "confluence.content-restrictions.relevantviewrestrictions.list":
      "confluence-content-collaboration",
    // C-A confluence-content-collaboration — 4.3 attachments / watch / users (17 ops)
    "confluence.attachments.content.child.update": "confluence-content-collaboration",
    "confluence.attachments.content.child.extractedtext.list": "confluence-content-collaboration",
    "confluence.attachments.content.child.move": "confluence-content-collaboration",
    "confluence.attachments.content.child.version.delete": "confluence-content-collaboration",
    "confluence.user-watch.content.create": "confluence-content-collaboration",
    "confluence.user-watch.content.get": "confluence-content-collaboration",
    "confluence.user-watch.content.delete": "confluence-content-collaboration",
    "confluence.user-watch.space.create": "confluence-content-collaboration",
    "confluence.user-watch.space.get": "confluence-content-collaboration",
    "confluence.user-watch.space.delete": "confluence-content-collaboration",
    "confluence.content-watchers.list": "confluence-content-collaboration",
    "confluence.space-watchers.list": "confluence-content-collaboration",
    "confluence.users.current": "confluence-content-collaboration",
    "confluence.user.current.update": "confluence-content-collaboration",
    "confluence.user.memberof.list": "confluence-content-collaboration",
    "confluence.user.current.password.create": "confluence-content-collaboration",
    // C-B confluence-space-admin — 5.1 space lifecycle (25 ops)
    "confluence.spaces.create": "confluence-space-admin",
    "confluence.server.info": "confluence-space-admin",
    "confluence.spaces.get": "confluence-space-admin",
    "confluence.spaces.list": "confluence-space-admin",
    "confluence.spaces.update": "confluence-space-admin",
    "confluence.spaces.delete": "confluence-space-admin",
    "confluence.space.archive": "confluence-space-admin",
    "confluence.space.restore": "confluence-space-admin",
    "confluence.space.trash.list": "confluence-space-admin",
    "confluence.space.trash.delete": "confluence-space-admin",
    "confluence.space.content.list": "confluence-space-admin",
    "confluence.space.content.get": "confluence-space-admin",
    "confluence.space.personal.create": "confluence-space-admin",
    "confluence.space.private.create": "confluence-space-admin",
    "confluence.space-label.list": "confluence-space-admin",
    "confluence.space-label.popular.list": "confluence-space-admin",
    "confluence.space-label.recent.list": "confluence-space-admin",
    "confluence.space-label.related.list": "confluence-space-admin",
    "confluence.space-property.create": "confluence-space-admin",
    "confluence.space-property.create.spacekey": "confluence-space-admin",
    "confluence.space-property.get": "confluence-space-admin",
    "confluence.space-property.list": "confluence-space-admin",
    "confluence.space-property.update": "confluence-space-admin",
    "confluence.space-property.delete": "confluence-space-admin",
    "confluence.category.space.create": "confluence-space-admin",
    "confluence.category.space.delete": "confluence-space-admin",
    // C-B confluence-space-admin — 5.2 permissions & appearance (16 ops)
    "confluence.space-permissions.list": "confluence-space-admin",
    "confluence.space-permissions.create": "confluence-space-admin",
    "confluence.space-permissions.user.get": "confluence-space-admin",
    "confluence.space-permissions.user.grant": "confluence-space-admin",
    "confluence.space-permissions.user.revoke": "confluence-space-admin",
    "confluence.space-permissions.group.get": "confluence-space-admin",
    "confluence.space-permissions.group.grant": "confluence-space-admin",
    "confluence.space-permissions.group.revoke": "confluence-space-admin",
    "confluence.space-permissions.anonymous.list": "confluence-space-admin",
    "confluence.space-permissions.anonymous.grant": "confluence-space-admin",
    "confluence.space-permissions.anonymous.revoke": "confluence-space-admin",
    "confluence.spacecolorscheme.space.color-scheme.list": "confluence-space-admin",
    "confluence.spacecolorscheme.space.color-scheme.update": "confluence-space-admin",
    "confluence.spacecolorscheme.space.color-scheme.reset": "confluence-space-admin",
    "confluence.spacecolorscheme.space.color-scheme.type.list": "confluence-space-admin",
    "confluence.spacecolorscheme.space.color-scheme.type.update": "confluence-space-admin",
    "confluence.search": "confluence-content-collaboration",
    "bitbucket.pullrequests.create": "bitbucket-pr-lifecycle",
    "bitbucket.pullrequests.get": "bitbucket-pr-lifecycle",
    "bitbucket.pullrequests.comments.add": "bitbucket-pr-lifecycle",
    "bitbucket.pullrequests.diff": "bitbucket-pr-lifecycle",
    "bitbucket.pullrequests.approve": "bitbucket-pr-lifecycle",
    "bitbucket.pullrequests.merge": "bitbucket-pr-lifecycle",
    "bitbucket.projects.create": "bitbucket-project-repo-admin",
    "bitbucket.projects.delete": "bitbucket-project-repo-admin",
    "bitbucket.projects.get": "bitbucket-project-repo-admin",
    "bitbucket.projects.list": "bitbucket-project-repo-admin",
    "bitbucket.server.info": "bitbucket-project-repo-admin",
    "bitbucket.projects.update": "bitbucket-project-repo-admin",
    "bitbucket.project.avatar-png.create": "bitbucket-project-repo-admin",
    "bitbucket.project.avatar-png.list": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.all.create": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.all.list": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.delete": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.groups.delete": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.groups.list": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.groups.none.list": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.groups.update": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.search.list": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.users.delete": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.users.none.list": "bitbucket-project-repo-admin",
    "bitbucket.project.permissions.users.update": "bitbucket-project-repo-admin",
    "bitbucket.project.repos.contributing.list": "bitbucket-project-repo-admin",
    "bitbucket.project.repos.create": "bitbucket-project-repo-admin",
    "bitbucket.project.repos.default-branch.list": "bitbucket-project-repo-admin",
    "bitbucket.project.repos.default-branch.update": "bitbucket-project-repo-admin",
    "bitbucket.project.repos.forks.list": "bitbucket-project-repo-admin",
    "bitbucket.project.repos.readme.list": "bitbucket-project-repo-admin",
    "bitbucket.project.repos.recreate.create": "bitbucket-project-repo-admin",
    "bitbucket.project.repos.related.list": "bitbucket-project-repo-admin",
    "bitbucket.project.settings-restriction.all.list": "bitbucket-project-repo-admin",
    "bitbucket.project.settings-restriction.create": "bitbucket-project-repo-admin",
    "bitbucket.project.settings-restriction.delete": "bitbucket-project-repo-admin",
    "bitbucket.project.settings-restriction.list": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.auto-decline.delete": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.auto-decline.list": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.auto-decline.update": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.auto-merge.delete": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.auto-merge.list": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.auto-merge.update": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.change-author.delete": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.change-author.list": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.change-author.update": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.hooks.enabled.delete": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.hooks.enabled.update": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.hooks.get": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.hooks.list": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.hooks.settings.get": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.hooks.settings.update": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.pull-requests.create": "bitbucket-project-repo-admin",
    "bitbucket.project.settings.pull-requests.get": "bitbucket-project-repo-admin",
    "bitbucket.project.webhooks.create": "bitbucket-project-repo-admin",
    "bitbucket.project.webhooks.delete": "bitbucket-project-repo-admin",
    "bitbucket.project.webhooks.get": "bitbucket-project-repo-admin",
    "bitbucket.project.webhooks.latest.list": "bitbucket-project-repo-admin",
    "bitbucket.project.webhooks.list": "bitbucket-project-repo-admin",
    "bitbucket.project.webhooks.statistics.list": "bitbucket-project-repo-admin",
    "bitbucket.project.webhooks.statistics.summary.get": "bitbucket-project-repo-admin",
    "bitbucket.project.webhooks.test.create": "bitbucket-project-repo-admin",
    "bitbucket.project.webhooks.update": "bitbucket-project-repo-admin",
    "bitbucket.repositories.create": "bitbucket-project-repo-admin",
    "bitbucket.repositories.delete": "bitbucket-project-repo-admin",
    "bitbucket.repositories.get": "bitbucket-project-repo-admin",
    "bitbucket.repositories.list": "bitbucket-project-repo-admin",
    "bitbucket.repositories.update": "bitbucket-project-repo-admin",
    "bitbucket.permissions.users": "bitbucket-project-repo-admin",
    "bitbucket.permission-management.projects.repos.delete": "bitbucket-project-repo-admin",
    "bitbucket.permission-management.projects.repos.groups.delete": "bitbucket-project-repo-admin",
    "bitbucket.permission-management.projects.repos.groups.list": "bitbucket-project-repo-admin",
    "bitbucket.permission-management.projects.repos.groups.none.list":
      "bitbucket-project-repo-admin",
    "bitbucket.permission-management.projects.repos.groups.update": "bitbucket-project-repo-admin",
    "bitbucket.permission-management.projects.repos.search.list": "bitbucket-project-repo-admin",
    "bitbucket.permission-management.projects.repos.users.delete": "bitbucket-project-repo-admin",
    "bitbucket.permission-management.projects.repos.users.list": "bitbucket-project-repo-admin",
    "bitbucket.permission-management.projects.repos.users.none.list":
      "bitbucket-project-repo-admin",
    "bitbucket.permission-management.projects.repos.users.update": "bitbucket-project-repo-admin",
    "bitbucket.access-tokens.projects.create": "bitbucket-project-repo-admin",
    "bitbucket.access-tokens.projects.delete": "bitbucket-project-repo-admin",
    "bitbucket.access-tokens.projects.get": "bitbucket-project-repo-admin",
    "bitbucket.access-tokens.projects.get.projectkey": "bitbucket-project-repo-admin",
    "bitbucket.access-tokens.projects.repos.create": "bitbucket-project-repo-admin",
    "bitbucket.access-tokens.projects.repos.delete": "bitbucket-project-repo-admin",
    "bitbucket.access-tokens.projects.repos.get": "bitbucket-project-repo-admin",
    "bitbucket.access-tokens.projects.repos.get.projectkey": "bitbucket-project-repo-admin",
    "bitbucket.access-tokens.projects.repos.update": "bitbucket-project-repo-admin",
    "bitbucket.access-tokens.projects.update": "bitbucket-project-repo-admin",
    "bitbucket.files.raw": "bitbucket-project-repo-admin",
    "bitbucket.repository.projects.repos.archive.list": "bitbucket-project-repo-admin",
    // B-B bitbucket-repo-content (86 ops — repository content, builds, webhooks, branch-permissions)
    "bitbucket.branch-permissions.projects.repos.restrictions.create": "bitbucket-repo-content",
    "bitbucket.branch-permissions.projects.repos.restrictions.delete": "bitbucket-repo-content",
    "bitbucket.branch-permissions.projects.repos.restrictions.get": "bitbucket-repo-content",
    "bitbucket.branch-permissions.projects.repos.restrictions.list": "bitbucket-repo-content",
    "bitbucket.branch-permissions.restrictions.create": "bitbucket-repo-content",
    "bitbucket.branch-permissions.restrictions.delete": "bitbucket-repo-content",
    "bitbucket.branch-permissions.restrictions.get": "bitbucket-repo-content",
    "bitbucket.branch-permissions.restrictions.list": "bitbucket-repo-content",
    "bitbucket.branches.list": "bitbucket-repo-content",
    "bitbucket.builds-and-deployments.projects.repos.commits.create": "bitbucket-repo-content",
    "bitbucket.builds-and-deployments.projects.repos.commits.create.projectkey":
      "bitbucket-repo-content",
    "bitbucket.builds-and-deployments.projects.repos.commits.delete": "bitbucket-repo-content",
    "bitbucket.builds-and-deployments.projects.repos.commits.delete.projectkey":
      "bitbucket-repo-content",
    "bitbucket.builds-and-deployments.projects.repos.commits.list": "bitbucket-repo-content",
    "bitbucket.builds-and-deployments.projects.repos.commits.list.projectkey":
      "bitbucket-repo-content",
    "bitbucket.commits.get": "bitbucket-repo-content",
    "bitbucket.commits.list": "bitbucket-repo-content",
    "bitbucket.files.browse": "bitbucket-repo-content",
    // attachments.* are permanently excluded from the exposure policy — no REST endpoint exists to create them
    "bitbucket.repository.projects.repos.branches.create": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.browse.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.browse.update": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.changes.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.commits.changes.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.commits.comments.delete": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.commits.comments.get": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.commits.comments.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.commits.comments.update": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.commits.diff-stats-summary.get": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.commits.diff.get": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.commits.merge-base.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.commits.watch": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.commits.watch.delete": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.compare.changes.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.compare.commits.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.compare.diff-path.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.compare.diff-stats-summary-path.list":
      "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.diff.get": "bitbucket-repo-content",
    // diff.list is excluded from the exposure policy.
    "bitbucket.repository.projects.repos.files.get": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.files.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.labels.create": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.labels.delete": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.labels.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.last-modified.get": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.last-modified.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.patch.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.ref-change-activities.branches.list":
      "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.ref-change-activities.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.auto-decline.delete": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.auto-decline.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.auto-decline.update": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.auto-merge.delete": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.auto-merge.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.auto-merge.update": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.change-author.delete": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.change-author.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.change-author.update": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.hooks.delete": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.hooks.enabled.delete": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.hooks.enabled.update": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.hooks.get": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.hooks.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.hooks.settings.get": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.hooks.settings.update": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.pull-requests.create": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.settings.pull-requests.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.tags.create": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.tags.get": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.tags.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.watch": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.watch.delete": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.webhooks.delete": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.webhooks.get": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.webhooks.latest.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.webhooks.search.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.webhooks.statistics.list": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.webhooks.statistics.summary.get": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.webhooks.test.create": "bitbucket-repo-content",
    "bitbucket.repository.projects.repos.webhooks.update": "bitbucket-repo-content",
    "bitbucket.webhooks.create": "bitbucket-repo-content",
    "bitbucket.webhooks.list": "bitbucket-repo-content",
    // B-C bitbucket-pull-request-lifecycle (60 ops)
    "bitbucket.pull-requests.projects.repos.commits.pull-requests.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.participants.list": "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.create":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.delete":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.auto-merge.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.create":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.delete":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.get":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.blocker-comments.update":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.changes.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.comments.apply-suggestion.create":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.comments.get":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.comments.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.commit-message-suggestion.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.commits.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.delete":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.diff-stats-summary.get":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.diff.get":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.get": "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.merge-base.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.merge.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.participants.create":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.participants.delete":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.participants.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.participants.update":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.review.delete":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.review.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.review.update":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.watch":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.pull-requests.watch.delete":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.create":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.delete":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.get":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.update":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.repos.settings.reviewer-groups.users.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.settings.reviewer-groups.create":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.settings.reviewer-groups.delete":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.settings.reviewer-groups.get":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.settings.reviewer-groups.list":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pull-requests.projects.settings.reviewer-groups.update":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.pullrequests.activities": "bitbucket-pull-request-lifecycle",
    "bitbucket.pullrequests.comments.delete": "bitbucket-pull-request-lifecycle",
    "bitbucket.pullrequests.comments.update": "bitbucket-pull-request-lifecycle",
    "bitbucket.pullrequests.decline": "bitbucket-pull-request-lifecycle",
    "bitbucket.pullrequests.list": "bitbucket-pull-request-lifecycle",
    "bitbucket.pullrequests.reopen": "bitbucket-pull-request-lifecycle",
    "bitbucket.pullrequests.unapprove": "bitbucket-pull-request-lifecycle",
    "bitbucket.pullrequests.update": "bitbucket-pull-request-lifecycle",
    "bitbucket.default-tasks.projects.repos.tasks.create": "bitbucket-pull-request-lifecycle",
    "bitbucket.default-tasks.projects.repos.tasks.delete": "bitbucket-pull-request-lifecycle",
    "bitbucket.default-tasks.projects.repos.tasks.delete.projectkey":
      "bitbucket-pull-request-lifecycle",
    "bitbucket.default-tasks.projects.repos.tasks.list": "bitbucket-pull-request-lifecycle",
    "bitbucket.default-tasks.projects.repos.tasks.update": "bitbucket-pull-request-lifecycle",
    "bitbucket.default-tasks.tasks.create": "bitbucket-pull-request-lifecycle",
    "bitbucket.default-tasks.tasks.delete": "bitbucket-pull-request-lifecycle",
    "bitbucket.default-tasks.tasks.delete.projectkey": "bitbucket-pull-request-lifecycle",
    "bitbucket.default-tasks.tasks.list": "bitbucket-pull-request-lifecycle",
    "bitbucket.default-tasks.tasks.update": "bitbucket-pull-request-lifecycle",
    "jira.issue.search": "jira-search-basic",
    "jira.search.create": "jira-search-basic",
    // J1 jira-metadata-sweep (17 ops)
    "jira.attachment.meta.list": "jira-metadata-sweep",
    "jira.custom-field-option.customfieldoption.get": "jira-metadata-sweep",
    "jira.custom-fields.customfields.list": "jira-metadata-sweep",
    "jira.custom-fields.customfields.options.list": "jira-metadata-sweep",
    "jira.fields.list": "jira-metadata-sweep",
    "jira.issue-type.issuetype.get": "jira-metadata-sweep",
    "jira.issue-type.issuetype.list": "jira-metadata-sweep",
    "jira.priority.get": "jira-metadata-sweep",
    "jira.priority.list": "jira-metadata-sweep",
    "jira.priority.page.list": "jira-metadata-sweep",
    "jira.resolution.get": "jira-metadata-sweep",
    "jira.resolution.list": "jira-metadata-sweep",
    "jira.status.get": "jira-metadata-sweep",
    "jira.status.list": "jira-metadata-sweep",
    "jira.status-category.statuscategory.get": "jira-metadata-sweep",
    "jira.status-category.statuscategory.list": "jira-metadata-sweep",
    "jira.server.info": "jira-metadata-sweep",
    // J2 jira-issue-collaboration (19 ops)
    "jira.issue.comment.get": "jira-issue-collaboration",
    "jira.issue.comment.pin": "jira-issue-collaboration",
    "jira.issue.comments.add": "jira-issue-collaboration",
    "jira.issue.comments.delete": "jira-issue-collaboration",
    "jira.issue.comments.list": "jira-issue-collaboration",
    "jira.issue.comments.update": "jira-issue-collaboration",
    "jira.issue.pinned-comments.list": "jira-issue-collaboration",
    "jira.issue.subtask.list": "jira-issue-collaboration",
    "jira.issue.votes.create": "jira-issue-collaboration",
    "jira.issue.votes.delete": "jira-issue-collaboration",
    "jira.issue.votes.list": "jira-issue-collaboration",
    "jira.issue.watchers.add": "jira-issue-collaboration",
    "jira.issue.watchers.delete": "jira-issue-collaboration",
    "jira.issue.watchers.list": "jira-issue-collaboration",
    "jira.issue.worklog.delete": "jira-issue-collaboration",
    "jira.issue.worklog.get": "jira-issue-collaboration",
    "jira.issue.worklog.update": "jira-issue-collaboration",
    "jira.issue.worklogs.add": "jira-issue-collaboration",
    "jira.issue.worklogs.list": "jira-issue-collaboration",
    // J3 jira-issue-structure (17 ops)
    "jira.issue.archive": "jira-issue-structure",
    "jira.issue.archive.issueidorkey": "jira-issue-structure",
    "jira.issue.assignee.update": "jira-issue-structure",
    "jira.issue.bulk": "jira-issue-structure",
    "jira.issue.createmeta.issuetypes.get": "jira-issue-structure",
    "jira.issue.editmeta.list": "jira-issue-structure",
    "jira.issue.remotelink.create": "jira-issue-structure",
    "jira.issue.remotelink.delete": "jira-issue-structure",
    "jira.issue.remotelink.delete.issueidorkey": "jira-issue-structure",
    "jira.issue.remotelink.get": "jira-issue-structure",
    "jira.issue.remotelink.list": "jira-issue-structure",
    "jira.issue.remotelink.update": "jira-issue-structure",
    "jira.issue.restore": "jira-issue-structure",
    "jira.issue.subtask.move": "jira-issue-structure",
    "jira.issue.subtask.move.list": "jira-issue-structure",
    "jira.issue.transitions.list": "jira-issue-structure",
    "jira.issue.transitions.perform": "jira-issue-structure",
    // J4 jira-search-users (7 ops)
    "jira.issue.picker.list": "jira-search-users",
    "jira.search.error.lookup.list": "jira-search-users",
    "jira.user.assignable.multiprojectsearch.list": "jira-search-users",
    "jira.user.assignable.search.list": "jira-search-users",
    "jira.user.viewissue.search.list": "jira-search-users",
    "jira.users.get": "jira-search-users",
    "jira.users.search": "jira-search-users",
    // J5 jira-filters-dashboards (20 ops)
    "jira.dashboard.get": "jira-filters-dashboards",
    "jira.dashboard.items.properties.delete": "jira-filters-dashboards",
    "jira.dashboard.items.properties.get": "jira-filters-dashboards",
    "jira.dashboard.items.properties.get.dashboardid": "jira-filters-dashboards",
    "jira.dashboard.items.properties.update": "jira-filters-dashboards",
    "jira.dashboard.list": "jira-filters-dashboards",
    "jira.filter.columns.delete": "jira-filters-dashboards",
    "jira.filter.columns.list": "jira-filters-dashboards",
    "jira.filter.columns.update": "jira-filters-dashboards",
    "jira.filter.create": "jira-filters-dashboards",
    "jira.filter.defaultsharescope.list": "jira-filters-dashboards",
    "jira.filter.defaultsharescope.update": "jira-filters-dashboards",
    "jira.filter.delete": "jira-filters-dashboards",
    "jira.filter.favourite.list": "jira-filters-dashboards",
    "jira.filter.get": "jira-filters-dashboards",
    "jira.filter.permission.create": "jira-filters-dashboards",
    "jira.filter.permission.delete": "jira-filters-dashboards",
    "jira.filter.permission.get": "jira-filters-dashboards",
    "jira.filter.permission.list": "jira-filters-dashboards",
    "jira.filter.update": "jira-filters-dashboards",
    // J6 jira-project-lifecycle (19 ops)
    "jira.project.components.list": "jira-project-lifecycle",
    "jira.project.issuesecuritylevelscheme.list": "jira-project-lifecycle",
    "jira.project.notificationscheme.list": "jira-project-lifecycle",
    "jira.project.permissionscheme.list": "jira-project-lifecycle",
    "jira.project.role.get": "jira-project-lifecycle",
    "jira.project.role.list": "jira-project-lifecycle",
    "jira.project.securitylevel.list": "jira-project-lifecycle",
    "jira.project.statuses.list": "jira-project-lifecycle",
    "jira.project.type.get": "jira-project-lifecycle",
    "jira.project.type.list": "jira-project-lifecycle",
    "jira.project.version.list": "jira-project-lifecycle",
    "jira.project.versions.list": "jira-project-lifecycle",
    "jira.project.workflowscheme.list": "jira-project-lifecycle",
    "jira.projects.create": "jira-project-lifecycle",
    "jira.projects.delete": "jira-project-lifecycle",
    "jira.projects.get": "jira-project-lifecycle",
    "jira.projects.list": "jira-project-lifecycle",
    "jira.projects.update": "jira-project-lifecycle",
    // J6 jira-project-mutations (13 ops — avatar.delete now reachable via JVM session fix)
    "jira.project.archive": "jira-project-mutations",
    "jira.project.permissionscheme.update": "jira-project-mutations",
    "jira.project.restore": "jira-project-mutations",
    "jira.project.role.create": "jira-project-mutations",
    "jira.project.role.delete": "jira-project-mutations",
    "jira.project.role.update": "jira-project-mutations",
    "jira.project.type.update": "jira-project-mutations",
    // J6 jira-version-admin (15 ops)
    "jira.version.create": "jira-version-admin",
    "jira.version.get": "jira-version-admin",
    "jira.version.mergeto.update": "jira-version-admin",
    "jira.version.move": "jira-version-admin",
    "jira.version.relatedissuecounts.list": "jira-version-admin",
    "jira.version.remotelink.create": "jira-version-admin",
    "jira.version.remotelink.create.versionid": "jira-version-admin",
    "jira.version.remotelink.delete": "jira-version-admin",
    "jira.version.remotelink.delete.versionid": "jira-version-admin",
    "jira.version.remotelink.get": "jira-version-admin",
    "jira.version.remotelink.list": "jira-version-admin",
    "jira.version.remotelink.list.versionid": "jira-version-admin",
    "jira.version.removeandswap.create": "jira-version-admin",
    "jira.version.unresolvedissuecount.list": "jira-version-admin",
    "jira.version.update": "jira-version-admin",
    // J6 jira-component-admin (5 ops)
    "jira.component.create": "jira-component-admin",
    "jira.component.delete": "jira-component-admin",
    "jira.component.get": "jira-component-admin",
    "jira.component.relatedissuecounts.list": "jira-component-admin",
    "jira.component.update": "jira-component-admin",
    // E4 jira-agile-lifecycle (39 ops — read 24 / safe 12 / risky 3)
    "jira.agile.backlog.issues.move": "jira-agile-lifecycle",
    "jira.agile.boards.backlog.list": "jira-agile-lifecycle",
    "jira.agile.boards.configuration.get": "jira-agile-lifecycle",
    "jira.agile.boards.create": "jira-agile-lifecycle",
    "jira.agile.boards.delete": "jira-agile-lifecycle",
    "jira.agile.boards.epics.issues.list": "jira-agile-lifecycle",
    "jira.agile.boards.epics.list": "jira-agile-lifecycle",
    "jira.agile.boards.epics.none.issues.list": "jira-agile-lifecycle",
    "jira.agile.boards.get": "jira-agile-lifecycle",
    "jira.agile.boards.issues.list": "jira-agile-lifecycle",
    "jira.agile.boards.list": "jira-agile-lifecycle",
    "jira.agile.boards.projects.list": "jira-agile-lifecycle",
    "jira.agile.boards.properties.get": "jira-agile-lifecycle",
    "jira.agile.boards.properties.list": "jira-agile-lifecycle",
    "jira.agile.boards.settings.refined-velocity.get": "jira-agile-lifecycle",
    "jira.agile.boards.sprints.issues.list": "jira-agile-lifecycle",
    "jira.agile.boards.sprints.list": "jira-agile-lifecycle",
    "jira.agile.boards.versions.list": "jira-agile-lifecycle",
    "jira.agile.epics.get": "jira-agile-lifecycle",
    "jira.agile.epics.issues.list": "jira-agile-lifecycle",
    "jira.agile.epics.issues.move": "jira-agile-lifecycle",
    "jira.agile.epics.none.issues.list": "jira-agile-lifecycle",
    "jira.agile.epics.none.issues.move": "jira-agile-lifecycle",
    "jira.agile.epics.rank": "jira-agile-lifecycle",
    "jira.agile.epics.update": "jira-agile-lifecycle",
    "jira.agile.issues.estimation.get": "jira-agile-lifecycle",
    "jira.agile.issues.estimation.update": "jira-agile-lifecycle",
    "jira.agile.issues.get": "jira-agile-lifecycle",
    "jira.agile.issues.rank": "jira-agile-lifecycle",
    "jira.agile.sprints.create": "jira-agile-lifecycle",
    "jira.agile.sprints.delete": "jira-agile-lifecycle",
    "jira.agile.sprints.get": "jira-agile-lifecycle",
    "jira.agile.sprints.issues": "jira-agile-lifecycle",
    "jira.agile.sprints.issues.move": "jira-agile-lifecycle",
    "jira.agile.sprints.properties.get": "jira-agile-lifecycle",
    "jira.agile.sprints.properties.list": "jira-agile-lifecycle",
    "jira.agile.sprints.swap": "jira-agile-lifecycle",
    "jira.agile.sprints.update": "jira-agile-lifecycle",
    "jira.agile.sprints.update.partial": "jira-agile-lifecycle"
  })
);
const contractOnly = new Map(
  Object.entries({
    "jira.issue.create": "built-stdio-field-error-propagation"
  })
);
const lowValue = new Map(
  Object.entries({
    // The 5 bitbucket.repository.projects.repos.attachments.* ops formerly
    // listed here are now permanently excluded from the exposure policy (see
    // rule/source.md "完全不提供的功能"): Bitbucket 10.4.1 WADL confirms no
    // POST method on /attachments, so they can never be exercised.
    // Jira DC 11.3.5: POST /rest/api/2/project/{key}/avatar (crop finalise)
    // always returns a generic 500 ("Uploading the avatar has failed"), even
    // with JSESSIONID continuity, a fetchable temporary avatar, the
    // X-Atlassian-Token header, or an anonymous same-host/external image URL —
    // verified 2026-08-04 against the pinned container (no server-side fetch or
    // log output; the web UI uses a different action). Avatar creation is
    // covered via the 48x48 auto-create short-circuit in temporary.create;
    // list/update/delete are covered directly.
  })
);

function classify(operation) {
  if (automated.has(operation.operationId)) {
    return {
      status: "automated",
      scenario: automated.get(operation.operationId),
      evidence: "real-atlassian-via-built-stdio-mcp"
    };
  }
  if (contractOnly.has(operation.operationId)) {
    return {
      status: "contract-only",
      scenario: contractOnly.get(operation.operationId),
      reason:
        "The built stdio MCP mapping and response contract are verified against a mock upstream; real product semantics are not yet covered."
    };
  }
  if (lowValue.has(operation.operationId)) {
    return {
      status: "low-value",
      reason: lowValue.get(operation.operationId)
    };
  }
  if (operation.bodyKind === "multipart" || operation.responseKind === "binary") {
    return {
      status: "deferred",
      reason:
        "File transfer needs dedicated file-root, payload-integrity, and cleanup scenarios; generic lifecycle coverage would be misleading."
    };
  }
  if (operation.tags.some((tag) => ["avatar", "analytics", "diagnostics"].includes(tag))) {
    return {
      status: "low-value",
      reason:
        "The operation is exposed but has low developer-workflow value relative to its setup and assertion cost."
    };
  }
  return {
    status: "deferred",
    reason:
      "Registered and policy-tested, but not yet exercised against the pinned real Data Center baseline through MCP."
  };
}

const entries = [...POLICY_OPERATIONS]
  .sort((left, right) => left.operationId.localeCompare(right.operationId))
  .map((operation) => ({
    operationId: operation.operationId,
    product: operation.product,
    requiredTier: policyRequiredTier(operation),
    method: operation.method,
    path: operation.path,
    ...classify(operation)
  }));
const counts = {};
for (const entry of entries) counts[entry.status] = (counts[entry.status] ?? 0) + 1;
const document = `${JSON.stringify(
  {
    schemaVersion: 1,
    generatedFrom: "dist/operations/index.js",
    baseline: {
      jira: "atlassian/jira-software:11.3.5",
      confluence: "atlassian/confluence:10.2.11",
      bitbucket: "atlassian/bitbucket:10.4.1"
    },
    counts,
    operations: entries
  },
  null,
  2
)}\n`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {
    /* handled below */
  }
  if (current !== document) {
    process.stderr.write("E2E coverage ledger is stale. Run `pnpm coverage:generate`.\n");
    process.exitCode = 1;
  }

  // Grep validation: every automated operationId must appear in its scenario's
  // test source file. This catches map-test drift (e.g. an op is removed from
  // a test but the automated map still claims it is covered).
  const SCENARIO_FILES = new Map([
    ["jira-core-lifecycle", "tests/e2e/jira/core-lifecycle.e2e.test.ts"],
    ["jira-attachment-lifecycle", "tests/e2e/jira/core-lifecycle.e2e.test.ts"],
    ["jira-search-basic", "tests/e2e/jira/search-basic.e2e.test.ts"],
    ["jira-metadata-sweep", "tests/e2e/jira/metadata-sweep.e2e.test.ts"],
    ["jira-issue-collaboration", "tests/e2e/jira/issue-collaboration.e2e.test.ts"],
    ["jira-issue-structure", "tests/e2e/jira/issue-structure.e2e.test.ts"],
    ["jira-search-users", "tests/e2e/jira/search-users.e2e.test.ts"],
    ["jira-filters-dashboards", "tests/e2e/jira/filters-dashboards.e2e.test.ts"],
    ["jira-project-lifecycle", "tests/e2e/jira/project-lifecycle.e2e.test.ts"],
    ["jira-project-mutations", "tests/e2e/jira/project-mutations.e2e.test.ts"],
    ["jira-version-admin", "tests/e2e/jira/version-admin.e2e.test.ts"],
    ["jira-component-admin", "tests/e2e/jira/component-admin.e2e.test.ts"],
    ["jira-agile-lifecycle", "tests/e2e/jira/agile-lifecycle.e2e.test.ts"],
    ["bitbucket-pr-lifecycle", "tests/e2e/bitbucket.e2e.test.ts"],
    ["bitbucket-project-repo-admin", "tests/e2e/bitbucket/project-repo-admin.e2e.test.ts"],
    ["bitbucket-repo-content", "tests/e2e/bitbucket/repo-content.e2e.test.ts"],
    ["bitbucket-pull-request-lifecycle", "tests/e2e/bitbucket/pull-request-lifecycle.e2e.test.ts"],
    ["confluence-core-lifecycle", "tests/e2e/confluence.e2e.test.ts"],
    ["confluence-attachment-lifecycle", "tests/e2e/confluence.e2e.test.ts"],
    ["confluence-content-collaboration", "tests/e2e/confluence/content-collaboration.e2e.test.ts"],
    ["confluence-space-admin", "tests/e2e/confluence/space-admin.e2e.test.ts"]
  ]);
  // Named tools carry the operationId via structuredContent, so the
  // test source contains the tool name rather than the operationId literal.
  // This map allows the grep check to match either form.
  const NAMED_TOOL_SOURCES = new Map([
    ["jira.issue.create", ["jira_create_issue"]],
    ["jira.issue.get", ["jira_get_issue"]],
    ["jira.issue.update", ["jira_update_issue"]],
    ["jira.issue.comments.add", ["jira_add_comment"]],
    ["jira.issue.search", ["jira_search_issues"]],
    ["jira.fields.list", ["jira_list_fields"]],
    ["jira.issue.createmeta.issuetypes.list", ["jira_get_create_metadata"]],
    ["jira.issue.createmeta.issuetypes.get", ["jira_get_create_metadata"]],
    ["jira.issue.editmeta.list", ["jira_get_edit_metadata"]],
    ["jira.issue.transitions.list", ["jira_get_transitions"]],
    ["jira.issue.transitions.perform", ["jira_transition_issue"]],
    ["jira.issue.attachments.metadata", ["jira_download_attachment"]],
    ["confluence.content.create", ["confluence_create_content"]],
    ["confluence.content.get", ["confluence_get_content"]],
    ["confluence.content.update", ["confluence_update_content"]],
    ["confluence.content.delete", ["confluence_delete_content"]],
    ["confluence.attachments.content.child.data.create", ["confluence_download_attachment"]],
    ["bitbucket.pullrequests.create", ["bitbucket_create_pull_request"]],
    ["bitbucket.pullrequests.get", ["bitbucket_get_pull_request"]],
    ["bitbucket.pullrequests.comments.add", ["bitbucket_add_pull_request_comment"]],
    ["bitbucket.pullrequests.merge", ["bitbucket_merge_pull_request"]]
  ]);
  let grepMisses = 0;
  for (const [opId, scenario] of automated) {
    const file = SCENARIO_FILES.get(scenario);
    if (!file) {
      process.stderr.write(
        `[coverage] SCENARIO_FILES missing entry for scenario "${scenario}" (op ${opId})\n`
      );
      process.exitCode = 1;
      continue;
    }
    if (!existsSync(resolve(file))) {
      process.stderr.write(
        `[coverage] Test file not found: ${file} (scenario ${scenario}, op ${opId})\n`
      );
      process.exitCode = 1;
      continue;
    }
    const source = readFileSync(resolve(file), "utf8");
    const toolNames = NAMED_TOOL_SOURCES.get(opId) ?? [];
    if (!source.includes(opId) && !toolNames.some((toolName) => source.includes(toolName))) {
      process.stderr.write(`[coverage] ${opId} not found in ${file} (scenario: ${scenario})\n`);
      grepMisses++;
      process.exitCode = 1;
    }
  }
  if (grepMisses > 0) {
    process.stderr.write(
      `[coverage] ${grepMisses} operationId(s) missing from their scenario test files. ` +
        "Update the automated map or restore the test coverage.\n"
    );
  }
} else {
  writeFileSync(target, document);
  process.stdout.write(`Wrote ${entries.length} operation classifications to ${target}\n`);
}
