import type { Check, Finding } from "./types.js";
import { result } from "./types.js";
import { daysSince } from "./patterns.js";

const STALE_PUSH_DAYS = 180;

export const activityCheck: Check = {
  id: "activity",
  name: "Maintenance Activity",
  maxScore: 10,
  async run(ctx) {
    const pushAge = daysSince(ctx.repoInfo.pushed_at);

    const findings: Finding[] = [
      {
        ok: !ctx.repoInfo.archived,
        label: "Repository isn't archived",
        detail: ctx.repoInfo.archived ? "This repository is archived." : "Repository is active, not archived.",
      },
      {
        ok: pushAge < STALE_PUSH_DAYS,
        label: `Had a commit within the last ~${Math.round(STALE_PUSH_DAYS / 30)} months`,
        detail: `Last push was ${pushAge} days ago.`,
      },
    ];

    return result(this.id, this.name, this.maxScore, findings);
  },
};
