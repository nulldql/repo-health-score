import { test } from "node:test";
import assert from "node:assert/strict";
import { dependenciesCheck } from "../checks/dependencies.js";
import { fakeContext } from "./fixtures.js";

test("dependencies check is skipped (full score) when there's no manifest", async () => {
  const ctx = fakeContext({ tree: ["README.md", "src/index.ts"] });
  const result = await dependenciesCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
  assert.equal(result.findings.length, 1);
});

test("dependencies check awards full score with a manifest, lockfile, and bot config", async () => {
  const ctx = fakeContext({
    tree: ["package.json", "package-lock.json", ".github/dependabot.yml"],
  });
  const result = await dependenciesCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});

test("dependencies check flags a manifest with no lockfile", async () => {
  const ctx = fakeContext({ tree: ["package.json"] });
  const result = await dependenciesCheck.run(ctx);
  const finding = result.findings.find((f) => f.label.includes("locked"));
  assert.equal(finding?.ok, false);
});

test("dependencies check flags missing automated update bot config", async () => {
  const ctx = fakeContext({ tree: ["requirements.txt"] });
  const result = await dependenciesCheck.run(ctx);
  const finding = result.findings.find((f) => f.label.includes("automated dependency"));
  assert.equal(finding?.ok, false);
});
