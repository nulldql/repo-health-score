import type { Check, Finding } from "./types.js";
import { result } from "./types.js";
import { daysSince } from "./patterns.js";

const STALE_DAYS = 90;

export const issuesCheck: Check = {
  id: "issues",
  name: "Issue Management",
  maxScore: 15,
  async run(ctx) {
    const issues = await ctx.client.getIssues(ctx.owner, ctx.repo);
    const openIssues = issues.filter((i) => i.state === "open");
    const staleOpen = openIssues.filter((i) => daysSince(i.created_at) > STALE_DAYS);
    const staleRatio = openIssues.length > 0 ? staleOpen.length / openIssues.length : 0;

    const findings: Finding[] = [
      {
        ok: ctx.repoInfo.has_issues,
        label: "Issue tracker is enabled",
        detail: ctx.repoInfo.has_issues ? "Issues are enabled for this repo." : "Issues are disabled for this repo.",
      },
      {
        ok: Boolean(ctx.communityProfile?.files.issue_template),
        label: "Has an issue template",
        detail: ctx.communityProfile?.files.issue_template
          ? "Issue template found."
          : "No issue template detected.",
      },
      {
        ok: openIssues.length <= 5 || staleRatio < 0.5,
        label: "Doesn't have a large backlog of stale open issues",
        detail:
          openIssues.length === 0
            ? "No open issues in the sample checked."
            : `${staleOpen.length}/${openIssues.length} open issues (in the sample checked) have been open more than ${STALE_DAYS} days.`,
      },
    ];

    return result(this.id, this.name, this.maxScore, findings);
  },
};
