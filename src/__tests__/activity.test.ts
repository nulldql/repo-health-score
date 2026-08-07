import { test } from "node:test";
import assert from "node:assert/strict";
import { activityCheck } from "../checks/activity.js";
import { fakeContext, fakeRepoInfo } from "./fixtures.js";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

test("activity check awards full score for an active, non-archived repo", async () => {
  const ctx = fakeContext({ repoInfo: fakeRepoInfo({ pushed_at: daysAgo(1), archived: false }) });
  const result = await activityCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});

test("activity check flags an archived repo", async () => {
  const ctx = fakeContext({ repoInfo: fakeRepoInfo({ archived: true, pushed_at: daysAgo(1) }) });
  const result = await activityCheck.run(ctx);
  const finding = result.findings.find((f) => f.label.includes("archived"));
  assert.equal(finding?.ok, false);
});

test("activity check flags a stale last push", async () => {
  const ctx = fakeContext({ repoInfo: fakeRepoInfo({ pushed_at: daysAgo(400) }) });
  const result = await activityCheck.run(ctx);
  const finding = result.findings.find((f) => f.label.includes("commit within"));
  assert.equal(finding?.ok, false);
});
