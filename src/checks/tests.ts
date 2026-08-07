import type { Check, Finding } from "./types.js";
import { result } from "./types.js";
import { hasPath } from "./patterns.js";

const TEST_DIR_OR_FILE = [
  /(^|\/)tests?\//i,
  /(^|\/)__tests__\//i,
  /(^|\/)spec\//i,
  /\.test\.[jt]sx?$/i,
  /\.spec\.[jt]sx?$/i,
  /_test\.py$/i,
  /_test\.go$/i,
];

const TEST_CONFIG = [
  /(^|\/)jest\.config\.[cm]?[jt]s$/i,
  /(^|\/)vitest\.config\.[cm]?[jt]s$/i,
  /(^|\/)\.mocharc/i,
  /(^|\/)pytest\.ini$/i,
  /(^|\/)tox\.ini$/i,
  /(^|\/)phpunit\.xml$/i,
];

export const testsCheck: Check = {
  id: "tests",
  name: "Tests",
  maxScore: 15,
  async run(ctx) {
    const hasTestFiles = hasPath(ctx.tree, TEST_DIR_OR_FILE);
    const hasTestConfig = hasPath(ctx.tree, TEST_CONFIG);

    const findings: Finding[] = [
      {
        ok: hasTestFiles,
        label: "Has a test directory or test files",
        detail: hasTestFiles
          ? "Found test files or a tests directory."
          : "No test directory or *.test.* / *.spec.* files found.",
      },
      {
        ok: hasTestConfig || hasTestFiles,
        label: "Has a recognizable test setup",
        detail: hasTestConfig
          ? "Found a test framework config file."
          : hasTestFiles
            ? "Test files exist, presumed to run via the language's default tooling."
            : "No test framework config file found (jest, vitest, pytest, etc).",
      },
    ];

    return result(this.id, this.name, this.maxScore, findings);
  },
};
