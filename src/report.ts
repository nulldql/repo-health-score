import type { Scorecard } from "./score.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

const GRADE_COLOR: Record<string, string> = {
  A: GREEN,
  B: GREEN,
  C: YELLOW,
  D: YELLOW,
  F: RED,
};

function style(code: string, useColor: boolean): string {
  return useColor ? code : "";
}

export function toJson(repoSlug: string, scorecard: Scorecard) {
  return {
    repo: repoSlug,
    grade: scorecard.grade,
    percentage: scorecard.percentage,
    totalScore: scorecard.totalScore,
    maxScore: scorecard.maxScore,
    categories: scorecard.categories.map((c) => ({
      id: c.id,
      name: c.name,
      score: c.score,
      maxScore: c.maxScore,
      findings: c.findings,
    })),
  };
}

export function printReport(repoSlug: string, scorecard: Scorecard, useColor: boolean) {
  const c = (code: string) => style(code, useColor);
  const lines: string[] = [];

  lines.push("");
  lines.push(`${c(BOLD)}repo-health:${c(RESET)} health report`);
  lines.push(`${c(DIM)}${repoSlug}${c(RESET)}`);
  lines.push("");

  const gradeColor = c(GRADE_COLOR[scorecard.grade] ?? CYAN);
  lines.push(
    `${gradeColor}${c(BOLD)}${scorecard.grade}${c(RESET)}  ${c(BOLD)}${scorecard.percentage}%${c(RESET)} ${c(DIM)}(${scorecard.totalScore}/${scorecard.maxScore} points)${c(RESET)}`,
  );
  lines.push("");

  for (const category of scorecard.categories) {
    const categoryColor = c(
      category.score === category.maxScore ? GREEN : category.score === 0 ? RED : YELLOW,
    );
    lines.push(
      `${c(BOLD)}${category.name}${c(RESET)} ${categoryColor}${category.score}/${category.maxScore}${c(RESET)}`,
    );
    for (const finding of category.findings) {
      const mark = finding.ok ? `${c(GREEN)}✓${c(RESET)}` : `${c(RED)}✗${c(RESET)}`;
      lines.push(`  ${mark} ${finding.label}`);
      lines.push(`    ${c(DIM)}${finding.detail}${c(RESET)}`);
    }
    lines.push("");
  }

  console.log(lines.join("\n"));
}
