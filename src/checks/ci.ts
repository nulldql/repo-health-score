import type { Check, Finding } from "./types.js";
import { result } from "./types.js";
import { hasPath } from "./patterns.js";

const WORKFLOW_FILE = [/(^|\/)\.github\/workflows\/.+\.ya?ml$/i];
const OTHER_CI_CONFIG = [
  /(^|\/)\.circleci\/config\.ya?ml$/i,
  /(^|\/)\.travis\.ya?ml$/i,
  /(^|\/)\.gitlab-ci\.ya?ml$/i,
];

export const ciCheck: Check = {
  id: "ci",
  name: "Continuous Integration",
  maxScore: 15,
  async run(ctx) {
    const hasWorkflowFile = hasPath(ctx.tree, WORKFLOW_FILE);
    const hasOtherCi = hasPath(ctx.tree, OTHER_CI_CONFIG);
    const workflows = hasWorkflowFile ? await ctx.client.getWorkflows(ctx.owner, ctx.repo) : [];
    const runs = hasWorkflowFile ? await ctx.client.getWorkflowRuns(ctx.owner, ctx.repo) : [];

    const completedRuns = runs.filter(
      (r) => r.status === "completed" && r.conclusion !== "cancelled" && r.conclusion !== "skipped",
    );
    const successfulRuns = completedRuns.filter((r) => r.conclusion === "success");
    const successRate = completedRuns.length > 0 ? successfulRuns.length / completedRuns.length : null;

    const findings: Finding[] = [
      {
        ok: hasWorkflowFile || hasOtherCi,
        label: "Has a CI configuration",
        detail: hasWorkflowFile
          ? `${workflows.length} GitHub Actions workflow(s) found.`
          : hasOtherCi
            ? "Found a CI config for a non-GitHub-Actions provider."
            : "No CI configuration found.",
      },
      {
        ok: successRate === null ? hasWorkflowFile || hasOtherCi : successRate >= 0.7,
        label: "Recent CI runs are mostly passing",
        detail:
          successRate === null
            ? "No recent workflow run history to evaluate."
            : `${successfulRuns.length}/${completedRuns.length} of the last completed runs succeeded.`,
      },
    ];

    return result(this.id, this.name, this.maxScore, findings);
  },
};
