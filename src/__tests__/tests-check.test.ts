import { test } from "node:test";
import assert from "node:assert/strict";
import { testsCheck } from "../checks/tests.js";
import { fakeContext } from "./fixtures.js";

test("tests check scores zero with no test files or config", async () => {
  const ctx = fakeContext({ tree: ["src/index.ts", "README.md"] });
  const result = await testsCheck.run(ctx);
  assert.equal(result.score, 0);
});

test("tests check finds a __tests__ directory", async () => {
  const ctx = fakeContext({ tree: ["src/__tests__/index.test.ts", "src/index.ts"] });
  const result = await testsCheck.run(ctx);
  assert.ok(result.score > 0);
});

test("tests check recognizes a jest config as a full setup", async () => {
  const ctx = fakeContext({ tree: ["jest.config.js", "src/foo.test.js"] });
  const result = await testsCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});

test("tests check recognizes python test files without a config file", async () => {
  const ctx = fakeContext({ tree: ["app/models_test.py"] });
  const result = await testsCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});
