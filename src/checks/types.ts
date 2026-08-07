import type { CommunityProfile, GitHubClientLike, RepoInfo } from "../github.js";

export type CheckId =
  | "documentation"
  | "tests"
  | "ci"
  | "issues"
  | "releases"
  | "dependencies"
  | "accessibility"
  | "activity";

export type Finding = {
  ok: boolean;
  label: string;
  detail: string;
};

export type CategoryResult = {
  id: CheckId;
  name: string;
  score: number;
  maxScore: number;
  findings: Finding[];
};

export type CheckContext = {
  client: GitHubClientLike;
  owner: string;
  repo: string;
  repoInfo: RepoInfo;
  tree: string[];
  communityProfile: CommunityProfile | null;
};

export type Check = {
  id: CheckId;
  name: string;
  maxScore: number;
  run(ctx: CheckContext): Promise<CategoryResult>;
};

export function result(
  id: CheckId,
  name: string,
  maxScore: number,
  findings: Finding[],
): CategoryResult {
  const earned = findings.reduce((sum, f) => sum + (f.ok ? 1 : 0), 0);
  const score = findings.length === 0 ? 0 : Math.round((earned / findings.length) * maxScore);
  return { id, name, score, maxScore, findings };
}
