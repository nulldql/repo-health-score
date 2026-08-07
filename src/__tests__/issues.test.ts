import { test } from "node:test";
import assert from "node:assert/strict";
import { issuesCheck } from "../checks/issues.js";
import { fakeContext, fakeCommunityProfile, fakeRepoInfo } from "./fixtures.js";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

test("issues check awards full score with no open issues and a template", async () => {
  const ctx = fakeContext({ repoInfo: fakeRepoInfo({ has_issues: true }) }, { issues: [] });
  const result = await issuesCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});

test("issues check flags a disabled issue tracker", async () => {
  const ctx = fakeContext({ repoInfo: fakeRepoInfo({ has_issues: false }) }, { issues: [] });
  const result = await issuesCheck.run(ctx);
  const finding = result.findings.find((f) => f.label === "Issue tracker is enabled");
  assert.equal(finding?.ok, false);
});

test("issues check flags a missing issue template", async () => {
  const ctx = fakeContext(
    { communityProfile: fakeCommunityProfile({ issue_template: null }) },
    { issues: [] },
  );
  const result = await issuesCheck.run(ctx);
  const finding = result.findings.find((f) => f.label === "Has an issue template");
  assert.equal(finding?.ok, false);
});

test("issues check flags a large backlog of stale open issues", async () => {
  const staleIssues = Array.from({ length: 10 }, (_, i) => ({
    number: i,
    state: "open",
    created_at: daysAgo(200),
    closed_at: null,
    updated_at: daysAgo(200),
  }));
  const ctx = fakeContext({}, { issues: staleIssues });
  const result = await issuesCheck.run(ctx);
  const finding = result.findings.find((f) => f.label.includes("stale"));
  assert.equal(finding?.ok, false);
});

test("issues check tolerates a small number of old open issues", async () => {
  const staleIssues = Array.from({ length: 3 }, (_, i) => ({
    number: i,
    state: "open",
    created_at: daysAgo(200),
    closed_at: null,
    updated_at: daysAgo(200),
  }));
  const ctx = fakeContext({}, { issues: staleIssues });
  const result = await issuesCheck.run(ctx);
  const finding = result.findings.find((f) => f.label.includes("stale"));
  assert.equal(finding?.ok, true);
});
