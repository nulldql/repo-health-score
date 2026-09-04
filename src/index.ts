import { GitHubClient, GitHubApiError } from "./github.js";
import { CHECKS, type CheckContext } from "./checks/index.js";
import { buildScorecard } from "./score.js";
import { printReport, toJson } from "./report.js";
import { parseArgs, parseRepoSlug } from "./config.js";

async function main() {
  let config;
  try {
    config = await parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  if (!config) {
    process.exit(0);
  }

  let owner: string;
  let repo: string;
  try {
    ({ owner, repo } = parseRepoSlug(config.repo));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  const client = new GitHubClient({
    token: config.token,
    baseUrl: process.env.GITHUB_API_BASE_URL,
  });

  try {
    const repoInfo = await client.getRepo(owner, repo);
    const [tree, communityProfile] = await Promise.all([
      client.getTree(owner, repo, repoInfo.default_branch),
      client.getCommunityProfile(owner, repo),
    ]);

    const context: CheckContext = {
      client,
      owner,
      repo,
      repoInfo,
      tree: tree.map((entry) => entry.path),
      communityProfile,
    };

    if (config.categories.length > 0) {
      const knownNames = new Set(CHECKS.map((check) => check.name.toLowerCase()));
      const unknown = config.categories.filter((name) => !knownNames.has(name.toLowerCase()));
      if (unknown.length > 0) {
        const validList = CHECKS.map((check) => check.name).join(", ");
        throw new Error(`unknown --category "${unknown[0]}", valid categories are: ${validList}`);
      }
    }

    const checksToRun =
      config.categories.length === 0
        ? CHECKS
        : CHECKS.filter((check) =>
            config.categories.some((name) => name.toLowerCase() === check.name.toLowerCase()),
          );

    const categories = await Promise.all(checksToRun.map((check) => check.run(context)));
    const scorecard = buildScorecard(categories);
    const repoSlug = `${owner}/${repo}`;

    if (config.json) {
      console.log(JSON.stringify(toJson(repoSlug, scorecard), null, 2));
    } else {
      printReport(repoSlug, scorecard, config.color);
    }

    process.exit(scorecard.grade === "D" || scorecard.grade === "F" ? 1 : 0);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      console.error(err.message);
    } else {
      console.error((err as Error).message);
    }
    process.exit(1);
  }
}

main();
