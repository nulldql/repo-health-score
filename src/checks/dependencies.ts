import type { Check, Finding } from "./types.js";
import { result } from "./types.js";
import { findPath, hasPath } from "./patterns.js";

const MANIFESTS: Record<string, RegExp> = {
  "package.json": /(^|\/)package\.json$/i,
  "requirements.txt": /(^|\/)requirements\.txt$/i,
  "Gemfile": /(^|\/)Gemfile$/i,
  "go.mod": /(^|\/)go\.mod$/i,
  "Cargo.toml": /(^|\/)Cargo\.toml$/i,
  "pom.xml": /(^|\/)pom\.xml$/i,
  "composer.json": /(^|\/)composer\.json$/i,
};

const LOCKFILES_BY_MANIFEST: Record<string, RegExp[]> = {
  "package.json": [/(^|\/)package-lock\.json$/i, /(^|\/)yarn\.lock$/i, /(^|\/)pnpm-lock\.yaml$/i],
  "requirements.txt": [/(^|\/)Pipfile\.lock$/i, /(^|\/)poetry\.lock$/i],
  "Gemfile": [/(^|\/)Gemfile\.lock$/i],
  "go.mod": [/(^|\/)go\.sum$/i],
  "Cargo.toml": [/(^|\/)Cargo\.lock$/i],
  "pom.xml": [],
  "composer.json": [/(^|\/)composer\.lock$/i],
};

const DEPENDENCY_BOT = [/(^|\/)\.github\/dependabot\.ya?ml$/i, /(^|\/)renovate\.json5?$/i, /(^|\/)\.renovaterc/i];

export const dependenciesCheck: Check = {
  id: "dependencies",
  name: "Dependency Hygiene",
  maxScore: 10,
  async run(ctx) {
    let manifestName: string | null = null;
    for (const [name, pattern] of Object.entries(MANIFESTS)) {
      if (findPath(ctx.tree, [pattern])) {
        manifestName = name;
        break;
      }
    }

    if (!manifestName) {
      const findings: Finding[] = [
        {
          ok: true,
          label: "No dependency manifest to check",
          detail: "Didn't find a package.json, requirements.txt, or similar manifest, so this check is skipped.",
        },
      ];
      return result(this.id, this.name, this.maxScore, findings);
    }

    const lockfilePatterns = LOCKFILES_BY_MANIFEST[manifestName] ?? [];
    const noLockfileConvention = lockfilePatterns.length === 0;
    const hasLockfile = !noLockfileConvention && hasPath(ctx.tree, lockfilePatterns);
    const hasBotConfig = hasPath(ctx.tree, DEPENDENCY_BOT);

    const findings: Finding[] = [
      {
        ok: noLockfileConvention || hasLockfile,
        label: "Dependencies are locked to exact versions",
        detail: noLockfileConvention
          ? `${manifestName} doesn't have a common lockfile convention this tool checks for, so this is skipped.`
          : hasLockfile
            ? "Found a lockfile alongside the manifest."
            : `Found ${manifestName} but no matching lockfile.`,
      },
      {
        ok: hasBotConfig,
        label: "Has automated dependency updates configured",
        detail: hasBotConfig
          ? "Dependabot or Renovate config found."
          : "No Dependabot or Renovate config found.",
      },
    ];

    return result(this.id, this.name, this.maxScore, findings);
  },
};
