import { test } from "node:test";
import assert from "node:assert/strict";
import { releasesCheck } from "../checks/releases.js";
import { fakeContext } from "./fixtures.js";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

test("releases check awards full score for a recent published release", async () => {
  const ctx = fakeContext(
    {},
    {
      releases: [{ tag_name: "v1.0.0", published_at: daysAgo(10), draft: false, prerelease: false }],
    },
  );
  const result = await releasesCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});

test("releases check falls back to tags when there are no releases", async () => {
  const ctx = fakeContext({}, { releases: [], tags: [{ name: "v0.1.0" }] });
  const result = await releasesCheck.run(ctx);
  const finding = result.findings.find((f) => f.label.includes("tagged release"));
  assert.equal(finding?.ok, true);
});

test("releases check flags a stale release", async () => {
  const ctx = fakeContext(
    {},
    {
      releases: [{ tag_name: "v1.0.0", published_at: daysAgo(400), draft: false, prerelease: false }],
    },
  );
  const result = await releasesCheck.run(ctx);
  const finding = result.findings.find((f) => f.label.includes("stale"));
  assert.equal(finding?.ok, false);
});

test("releases check ignores draft and prerelease entries", async () => {
  const ctx = fakeContext(
    {},
    {
      releases: [
        { tag_name: "v2.0.0-beta", published_at: daysAgo(1), draft: false, prerelease: true },
        { tag_name: "draft", published_at: null, draft: true, prerelease: false },
      ],
      tags: [],
    },
  );
  const result = await releasesCheck.run(ctx);
  const finding = result.findings.find((f) => f.label.includes("tagged release"));
  assert.equal(finding?.ok, false);
});
