import type { Check, Finding } from "./types.js";
import { result } from "./types.js";
import { daysSince } from "./patterns.js";

const STALE_RELEASE_DAYS = 180;

export const releasesCheck: Check = {
  id: "releases",
  name: "Releases",
  maxScore: 10,
  async run(ctx) {
    const releases = (await ctx.client.getReleases(ctx.owner, ctx.repo)).filter(
      (r) => !r.draft && !r.prerelease && r.published_at,
    );
    const tags = releases.length === 0 ? await ctx.client.getTags(ctx.owner, ctx.repo) : [];
    const hasAny = releases.length > 0 || tags.length > 0;

    const latestAgeDays = releases[0]?.published_at ? daysSince(releases[0].published_at) : null;
    const repoAgeDays = daysSince(ctx.repoInfo.created_at);

    const findings: Finding[] = [
      {
        ok: hasAny,
        label: "Has at least one tagged release",
        detail:
          releases.length > 0
            ? `${releases.length} release(s) found.`
            : tags.length > 0
              ? `No formal releases, but ${tags.length} git tag(s) found.`
              : "No releases or tags found.",
      },
      {
        ok: latestAgeDays === null ? repoAgeDays < STALE_RELEASE_DAYS : latestAgeDays < STALE_RELEASE_DAYS,
        label: `Most recent release isn't stale (within ~${Math.round(STALE_RELEASE_DAYS / 30)} months)`,
        detail:
          latestAgeDays === null
            ? "No release date to evaluate; judged by repo age instead."
            : `Latest release was ${latestAgeDays} days ago.`,
      },
    ];

    return result(this.id, this.name, this.maxScore, findings);
  },
};
