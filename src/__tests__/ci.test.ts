import { test } from "node:test";
import assert from "node:assert/strict";
import { ciCheck } from "../checks/ci.js";
import { fakeContext } from "./fixtures.js";

test("ci check scores zero with no workflow files", async () => {
  const ctx = fakeContext({ tree: ["src/index.ts"] });
  const result = await ciCheck.run(ctx);
  assert.equal(result.score, 0);
});

test("ci check awards full score for a workflow file with all-passing recent runs", async () => {
  const ctx = fakeContext(
    { tree: [".github/workflows/ci.yml"] },
    {
      workflows: [{ id: 1, name: "CI", path: ".github/workflows/ci.yml", state: "active" }],
      workflowRuns: [
        { status: "completed", conclusion: "success", created_at: new Date().toISOString() },
        { status: "completed", conclusion: "success", created_at: new Date().toISOString() },
      ],
    },
  );
  const result = await ciCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});

test("ci check drops points when recent runs are mostly failing", async () => {
  const ctx = fakeContext(
    { tree: [".github/workflows/ci.yml"] },
    {
      workflows: [{ id: 1, name: "CI", path: ".github/workflows/ci.yml", state: "active" }],
      workflowRuns: [
        { status: "completed", conclusion: "failure", created_at: new Date().toISOString() },
        { status: "completed", conclusion: "failure", created_at: new Date().toISOString() },
        { status: "completed", conclusion: "success", created_at: new Date().toISOString() },
      ],
    },
  );
  const result = await ciCheck.run(ctx);
  assert.ok(result.score < result.maxScore);
});

test("ci check recognizes a non-GitHub-Actions CI config", async () => {
  const ctx = fakeContext({ tree: [".circleci/config.yml"] });
  const result = await ciCheck.run(ctx);
  const configFinding = result.findings.find((f) => f.label === "Has a CI configuration");
  assert.equal(configFinding?.ok, true);
});
