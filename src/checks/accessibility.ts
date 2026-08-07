import type { Check, Finding } from "./types.js";
import { result } from "./types.js";
import { findPath, hasPath } from "./patterns.js";

const A11Y_DOC = [/(^|\/)ACCESSIBILITY\.md$/i];

const A11Y_PACKAGES = [
  "eslint-plugin-jsx-a11y",
  "axe-core",
  "@axe-core/react",
  "@axe-core/playwright",
  "jest-axe",
  "cypress-axe",
  "pa11y",
  "pa11y-ci",
  "lighthouse",
  "@lhci/cli",
];

export const accessibilityCheck: Check = {
  id: "accessibility",
  name: "Accessibility",
  maxScore: 5,
  async run(ctx) {
    const packageJsonPath = findPath(ctx.tree, [/(^|\/)package\.json$/i]);
    const hasA11yDoc = hasPath(ctx.tree, A11Y_DOC);

    if (!packageJsonPath) {
      const findings: Finding[] = [
        {
          ok: true,
          label: "Not a JavaScript project, accessibility tooling check skipped",
          detail: "No package.json found, so this check doesn't apply the same way.",
        },
      ];
      return result(this.id, this.name, this.maxScore, findings);
    }

    let hasA11yTooling = false;
    try {
      const raw = await ctx.client.getFileContent(ctx.owner, ctx.repo, packageJsonPath);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const allDeps = { ...parsed.dependencies, ...parsed.devDependencies };
        hasA11yTooling = A11Y_PACKAGES.some((pkg) => pkg in allDeps);
      }
    } catch {
      hasA11yTooling = false;
    }

    const findings: Finding[] = [
      {
        ok: hasA11yTooling || hasA11yDoc,
        label: "Uses accessibility tooling or documents an accessibility policy",
        detail: hasA11yTooling
          ? "Found an accessibility-related dependency (e.g. axe-core, eslint-plugin-jsx-a11y)."
          : hasA11yDoc
            ? "Found an ACCESSIBILITY.md file."
            : "No accessibility tooling or ACCESSIBILITY.md found.",
      },
    ];

    return result(this.id, this.name, this.maxScore, findings);
  },
};
