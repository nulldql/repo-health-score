import { test } from "node:test";
import assert from "node:assert/strict";
import { docsCheck } from "../checks/docs.js";
import { fakeContext, fakeCommunityProfile, fakeRepoInfo } from "./fixtures.js";

test("docs check awards full score when everything is present", async () => {
  const ctx = fakeContext();
  const result = await docsCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});

test("docs check drops points for a missing README", async () => {
  const ctx = fakeContext({ communityProfile: fakeCommunityProfile({ readme: null }) });
  const result = await docsCheck.run(ctx);
  assert.ok(result.score < result.maxScore);
  const readmeFinding = result.findings.find((f) => f.label === "Has a README");
  assert.equal(readmeFinding?.ok, false);
});

test("docs check flags a missing description separately from files", async () => {
  const ctx = fakeContext({ repoInfo: fakeRepoInfo({ description: null }) });
  const result = await docsCheck.run(ctx);
  const descFinding = result.findings.find((f) => f.label === "Repo has a description set");
  assert.equal(descFinding?.ok, false);
});

test("docs check handles a missing community profile gracefully", async () => {
  const ctx = fakeContext({
    communityProfile: null,
    repoInfo: fakeRepoInfo({ description: null }),
  });
  const result = await docsCheck.run(ctx);
  assert.equal(result.score, 0);
  assert.ok(result.findings.every((f) => f.ok === false));
});
