import { readFile } from "node:fs/promises";

export type Config = {
  repo: string;
  json: boolean;
  color: boolean;
  token: string | undefined;
  categories: string[];
};

export function printHelp() {
  console.log(`
repo-health <owner/repo | github-url> [options]

Options:
  --json             Output machine-readable JSON instead of a report
  --no-color         Disable ANSI colors in the report
  --token <token>    GitHub token for a higher API rate limit
                      (falls back to the GITHUB_TOKEN environment variable)
  --category <name>  Only report this category (repeatable), e.g. "Tests"
  --help             Show this message
  --version          Print the installed version

Examples:
  repo-health facebook/react
  repo-health https://github.com/facebook/react
  repo-health facebook/react --json > report.json
  repo-health facebook/react --category Tests --category CI
`);
}

export async function readPackageVersion(): Promise<string> {
  const pkg = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf-8"),
  );
  return pkg.version;
}

export function parseRepoSlug(input: string): { owner: string; repo: string } {
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  cleaned = cleaned.replace(/\/$/, "");
  cleaned = cleaned.replace(/\.git$/i, "");

  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length !== 2) {
    throw new Error(`"${input}" doesn't look like an owner/repo or a GitHub URL.`);
  }

  return { owner: parts[0], repo: parts[1] };
}

export async function parseArgs(argv: string[]): Promise<Config | null> {
  let repo: string | null = null;
  let json = false;
  let color = true;
  let token = process.env.GITHUB_TOKEN;
  const categories: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      return null;
    }
    if (arg === "--version" || arg === "-v") {
      console.log(await readPackageVersion());
      return null;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--no-color") {
      color = false;
      continue;
    }
    if (arg === "--token") {
      const value = argv[++i];
      if (!value) throw new Error("--token needs a value");
      token = value;
      continue;
    }
    if (arg === "--category") {
      const value = argv[++i];
      if (!value) throw new Error("--category needs a category name");
      categories.push(value);
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (repo) {
      throw new Error("Only one repository can be scored at a time.");
    }
    repo = arg;
  }

  if (!repo) {
    printHelp();
    return null;
  }

  return { repo, json, color, token, categories };
}
