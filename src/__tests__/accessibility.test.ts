import { test } from "node:test";
import assert from "node:assert/strict";
import { accessibilityCheck } from "../checks/accessibility.js";
import { fakeContext } from "./fixtures.js";

test("accessibility check passes non-JS repos as not applicable", async () => {
  const ctx = fakeContext({ tree: ["main.go", "go.mod"] });
  const result = await accessibilityCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});

test("accessibility check finds a11y tooling in package.json", async () => {
  const ctx = fakeContext(
    { tree: ["package.json"] },
    {
      files: {
        "package.json": JSON.stringify({
          devDependencies: { "eslint-plugin-jsx-a11y": "^6.0.0" },
        }),
      },
    },
  );
  const result = await accessibilityCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});

test("accessibility check falls back to an ACCESSIBILITY.md file", async () => {
  const ctx = fakeContext(
    { tree: ["package.json", "ACCESSIBILITY.md"] },
    { files: { "package.json": JSON.stringify({ dependencies: {} }) } },
  );
  const result = await accessibilityCheck.run(ctx);
  assert.equal(result.score, result.maxScore);
});

test("accessibility check scores zero for a JS repo with no a11y signal", async () => {
  const ctx = fakeContext(
    { tree: ["package.json"] },
    { files: { "package.json": JSON.stringify({ dependencies: { react: "^18.0.0" } }) } },
  );
  const result = await accessibilityCheck.run(ctx);
  assert.equal(result.score, 0);
});
