import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScorecard, gradeFor } from "../score.js";
import type { CategoryResult } from "../checks/index.js";

function fakeCategory(overrides: Partial<CategoryResult> = {}): CategoryResult {
  return {
    id: "documentation",
    name: "Documentation",
    score: 20,
    maxScore: 20,
    findings: [],
    ...overrides,
  };
}

test("gradeFor maps percentages to the right letter grade", () => {
  assert.equal(gradeFor(95), "A");
  assert.equal(gradeFor(90), "A");
  assert.equal(gradeFor(85), "B");
  assert.equal(gradeFor(75), "C");
  assert.equal(gradeFor(65), "D");
  assert.equal(gradeFor(40), "F");
  assert.equal(gradeFor(0), "F");
});

test("buildScorecard sums scores and computes percentage against only the given categories", () => {
  const categories = [
    fakeCategory({ id: "documentation", score: 10, maxScore: 20 }),
    fakeCategory({ id: "tests", name: "Tests", score: 15, maxScore: 15 }),
  ];
  const card = buildScorecard(categories);
  assert.equal(card.totalScore, 25);
  assert.equal(card.maxScore, 35);
  assert.equal(card.percentage, Math.round((25 / 35) * 100));
});

test("buildScorecard handles an empty category list without dividing by zero", () => {
  const card = buildScorecard([]);
  assert.equal(card.totalScore, 0);
  assert.equal(card.maxScore, 0);
  assert.equal(card.percentage, 0);
  assert.equal(card.grade, "F");
});

test("buildScorecard grade reflects a perfect score", () => {
  const categories = [fakeCategory({ score: 20, maxScore: 20 })];
  const card = buildScorecard(categories);
  assert.equal(card.percentage, 100);
  assert.equal(card.grade, "A");
});
