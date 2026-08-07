import type { CategoryResult } from "./checks/index.js";

export type Grade = "A" | "B" | "C" | "D" | "F";

export type Scorecard = {
  categories: CategoryResult[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: Grade;
};

export function gradeFor(percentage: number): Grade {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
}

export function buildScorecard(categories: CategoryResult[]): Scorecard {
  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);
  const maxScore = categories.reduce((sum, c) => sum + c.maxScore, 0);
  const percentage = maxScore === 0 ? 0 : Math.round((totalScore / maxScore) * 100);

  return {
    categories,
    totalScore,
    maxScore,
    percentage,
    grade: gradeFor(percentage),
  };
}
