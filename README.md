# repo-health-score

A CLI that scores a GitHub repository's health and gives it a letter grade, based on documentation, tests, CI, issue management, releases, dependency hygiene, accessibility tooling, and how actively it's maintained.

I built this because "is this repo actually maintained" is a question you end up asking constantly when picking a dependency or reviewing a project, and normally you answer it by clicking around GitHub for five minutes. This just answers it in one command.

## Install

```bash
npm install -g repo-health-score
```

## Usage

```bash
repo-health facebook/react
```

You can also paste a full GitHub URL:

```bash
repo-health https://github.com/facebook/react
```

Unauthenticated requests are capped at 60 per hour by GitHub's API, which is fine for occasional use but you'll hit it fast if you're scoring a lot of repos. Pass a token for a much higher limit:

```bash
repo-health facebook/react --token ghp_yourtoken
```

Or set `GITHUB_TOKEN` in your environment and skip the flag entirely. A basic token with no special scopes is enough since this tool only reads public data.

### Options

```
--json               Output machine-readable JSON instead of a report
--no-color           Disable ANSI colors in the report
--token <token>      GitHub token for a higher API rate limit
                      (falls back to the GITHUB_TOKEN environment variable)
--category <name>    Only report this category (repeatable), e.g. "Tests"
--help                Show usage
--version             Print the installed version
```

The exit code reflects the grade: `0` for A through C, `1` for D or F, so you can gate a CI step on it if you want to enforce a minimum bar for a repo.

## Example output

```
repo-health: health report
facebook/react

A  96% (96/100 points)

Documentation 20/20
  ✓ Has a README
    README found.
  ✓ Has a LICENSE
    LICENSE found.

Tests 15/15
  ✓ Has a test directory or test files
    Found test files or a tests directory.
  ✓ Has a recognizable test setup
    Found a test framework config file.
```

## What it scores

| Category | Points | What it looks at |
|---|---|---|
| Documentation | 20 | README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, and whether the repo has a description set |
| Tests | 15 | A test directory or test files, plus a recognizable test framework config |
| Continuous Integration | 15 | A CI config (GitHub Actions, CircleCI, Travis, GitLab CI), and whether recent runs are mostly passing |
| Issue Management | 15 | Whether issues are enabled, an issue template exists, and open issues aren't piling up unanswered |
| Releases | 10 | At least one tagged release, and whether the most recent one is reasonably fresh |
| Dependency Hygiene | 10 | A lockfile alongside the dependency manifest, and automated update tooling like Dependabot or Renovate |
| Accessibility | 5 | Accessibility tooling in the dependencies (axe-core, eslint-plugin-jsx-a11y, pa11y, and similar) for JS projects, or an ACCESSIBILITY.md |
| Maintenance Activity | 10 | The repo isn't archived, and it's had a commit within roughly the last six months |

Each finding inside a category is a pass or fail check, and the category score is the percentage of those that passed, scaled to the category's point total. The overall grade comes from the total score across whichever categories ran (all eight by default, or just the ones you picked with `--category`).

A few of these checks lean on GitHub's own community profile API rather than guessing from file names, which is the same data GitHub uses for its own "Community Standards" checklist on a repo's Insights tab.

## Development

```bash
git clone https://github.com/nulldql/repo-health-score.git
cd repo-health-score
npm install
npm test
```

`npm test` builds the project and runs the full suite with Node's built-in test runner. Most of it is unit tests for each scoring check against fake data, and there's a set of integration tests that spin up a small local HTTP server standing in for the GitHub API, then run the actual compiled CLI against it as a real subprocess and check the real output and exit code.

## License

MIT
