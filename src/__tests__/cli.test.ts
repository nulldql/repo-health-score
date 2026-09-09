import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type {
  CommunityProfile,
  Issue,
  Release,
  RepoInfo,
  TreeEntry,
  Workflow,
  WorkflowRun,
} from "../github.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, "../index.js");

function packageJsonB64() {
  return Buffer.from(
    JSON.stringify({
      devDependencies: { jest: "^29.0.0", "eslint-plugin-jsx-a11y": "^6.0.0" },
    }),
  ).toString("base64");
}

type RepoFixture = {
  info: RepoInfo;
  profile: CommunityProfile;
  tree: { tree: TreeEntry[]; truncated: boolean };
  workflows: { workflows: Workflow[] };
  runs: { workflow_runs: WorkflowRun[] };
  releases: Release[];
  issues: Issue[];
};

const HEALTHY_REPO: RepoFixture = {
  info: {
    full_name: "octocat/healthy",
    description: "A well cared for repo",
    license: { spdx_id: "MIT" },
    has_issues: true,
    open_issues_count: 1,
    stargazers_count: 500,
    pushed_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(),
    archived: false,
    default_branch: "main",
    topics: ["cli"],
  },
  profile: {
    health_percentage: 100,
    files: {
      readme: { url: "x" },
      license: { url: "x" },
      contributing: { url: "x" },
      code_of_conduct: { url: "x" },
      issue_template: { url: "x" },
      pull_request_template: { url: "x" },
    },
  },
  tree: {
    tree: [
      { path: "package.json", type: "blob" },
      { path: "package-lock.json", type: "blob" },
      { path: ".github/dependabot.yml", type: "blob" },
      { path: ".github/workflows/ci.yml", type: "blob" },
      { path: "src/__tests__/foo.test.ts", type: "blob" },
    ],
    truncated: false,
  },
  workflows: { workflows: [{ id: 1, name: "CI", path: ".github/workflows/ci.yml", state: "active" }] },
  runs: {
    workflow_runs: [
      { status: "completed", conclusion: "success", created_at: new Date().toISOString() },
    ],
  },
  releases: [{ tag_name: "v1.0.0", published_at: new Date().toISOString(), draft: false, prerelease: false }],
  issues: [],
};

const UNHEALTHY_REPO: RepoFixture = {
  info: {
    full_name: "octocat/unhealthy",
    description: null,
    license: null,
    has_issues: true,
    open_issues_count: 50,
    stargazers_count: 0,
    pushed_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString(),
    archived: false,
    default_branch: "main",
    topics: [],
  },
  profile: {
    health_percentage: 10,
    files: {
      readme: { url: "x" },
      license: null,
      contributing: null,
      code_of_conduct: null,
      issue_template: null,
      pull_request_template: null,
    },
  },
  tree: { tree: [{ path: "index.js", type: "blob" }], truncated: false },
  workflows: { workflows: [] },
  runs: { workflow_runs: [] },
  releases: [],
  issues: [],
};

function oldOpenIssue(number: number): Issue {
  return {
    number,
    state: "open",
    created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    closed_at: null,
    updated_at: new Date().toISOString(),
  };
}

function ancientClosedIssue(number: number): Issue {
  return {
    number,
    state: "closed",
    created_at: new Date(Date.now() - 2000 * 24 * 60 * 60 * 1000).toISOString(),
    closed_at: new Date(Date.now() - 1900 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1900 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

const MANY_STALE_ISSUES_REPO: RepoFixture = {
  ...HEALTHY_REPO,
  info: { ...HEALTHY_REPO.info, full_name: "octocat/many-stale-issues", open_issues_count: 150 },
  issues: Array.from({ length: 150 }, (_, i) => oldOpenIssue(i + 1)),
};

const CANCELLED_RUNS_REPO: RepoFixture = {
  ...HEALTHY_REPO,
  info: { ...HEALTHY_REPO.info, full_name: "octocat/cancelled-runs" },
  runs: {
    workflow_runs: [
      { status: "completed", conclusion: "success", created_at: new Date().toISOString() },
      { status: "completed", conclusion: "success", created_at: new Date().toISOString() },
      { status: "completed", conclusion: "cancelled", created_at: new Date().toISOString() },
      { status: "completed", conclusion: "cancelled", created_at: new Date().toISOString() },
      { status: "completed", conclusion: "cancelled", created_at: new Date().toISOString() },
      { status: "completed", conclusion: "skipped", created_at: new Date().toISOString() },
    ],
  },
};

const OLD_CLOSED_HISTORY_REPO: RepoFixture = {
  ...HEALTHY_REPO,
  info: { ...HEALTHY_REPO.info, full_name: "octocat/old-closed-history", open_issues_count: 20 },
  issues: [
    ...Array.from({ length: 550 }, (_, i) => ancientClosedIssue(i + 1)),
    ...Array.from({ length: 20 }, (_, i) => oldOpenIssue(551 + i)),
  ],
};

const REPOS: Record<string, RepoFixture> = {
  "octocat/healthy": HEALTHY_REPO,
  "octocat/unhealthy": UNHEALTHY_REPO,
  "octocat/many-stale-issues": MANY_STALE_ISSUES_REPO,
  "octocat/old-closed-history": OLD_CLOSED_HISTORY_REPO,
  "octocat/cancelled-runs": CANCELLED_RUNS_REPO,
};

function startMockGitHub(): Promise<{ server: Server; baseUrl: string }> {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const parts = url.pathname.split("/").filter(Boolean);

      const send = (status: number, body: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };

      if (parts[0] !== "repos" || parts.length < 3) {
        send(404, { message: "not found" });
        return;
      }

      const slug = `${parts[1]}/${parts[2]}`;
      const fixture = REPOS[slug];
      if (!fixture) {
        send(404, { message: "not found" });
        return;
      }

      const rest = parts.slice(3).join("/");

      if (rest === "") return send(200, fixture.info);
      if (rest === "community/profile") return send(200, fixture.profile);
      if (rest.startsWith("git/trees/")) return send(200, fixture.tree);
      if (rest === "actions/workflows") return send(200, fixture.workflows);
      if (rest.startsWith("actions/runs")) return send(200, fixture.runs);
      if (rest.startsWith("releases")) return send(200, fixture.releases);
      if (rest.startsWith("tags")) return send(200, []);
      if (rest.startsWith("issues")) {
        const page = Number(url.searchParams.get("page") ?? "1");
        const perPage = Number(url.searchParams.get("per_page") ?? "100");
        const state = url.searchParams.get("state") ?? "open";
        const matching =
          state === "all" ? fixture.issues : fixture.issues.filter((issue) => issue.state === state);
        const start = (page - 1) * perPage;
        return send(200, matching.slice(start, start + perPage));
      }
      if (rest === "contents/package.json") {
        return send(200, { content: packageJsonB64(), encoding: "base64" });
      }

      send(404, { message: "not found" });
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolvePromise({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

type CliResult = { status: number | null; stdout: string; stderr: string };

function runCli(args: string[], baseUrl: string, timeoutMs = 10000): Promise<CliResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("node", [CLI_PATH, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GITHUB_API_BASE_URL: baseUrl, GITHUB_TOKEN: "" },
    });
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectPromise(new Error(`repo-health did not exit within ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("close", (status) => {
      clearTimeout(timer);
      resolvePromise({ status, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      rejectPromise(err);
    });
  });
}

test("cli exits 0 with a good grade for a healthy repo", async () => {
  const { server, baseUrl } = await startMockGitHub();
  try {
    const result = await runCli(["octocat/healthy", "--no-color"], baseUrl);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Has a README/);
    assert.match(result.stdout, /100%/);
  } finally {
    server.close();
  }
});

test("cli exits 1 with a poor grade for an unhealthy repo", async () => {
  const { server, baseUrl } = await startMockGitHub();
  try {
    const result = await runCli(["octocat/unhealthy", "--no-color"], baseUrl);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /F /);
  } finally {
    server.close();
  }
});

test("cli --json produces parseable JSON with the right shape", async () => {
  const { server, baseUrl } = await startMockGitHub();
  try {
    const result = await runCli(["octocat/healthy", "--json"], baseUrl);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.repo, "octocat/healthy");
    assert.equal(parsed.grade, "A");
    assert.ok(Array.isArray(parsed.categories));
    assert.equal(parsed.categories.length, 8);
  } finally {
    server.close();
  }
});

test("cli --category limits the report to the requested categories", async () => {
  const { server, baseUrl } = await startMockGitHub();
  try {
    const result = await runCli(["octocat/healthy", "--json", "--category", "Tests"], baseUrl);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.categories.length, 1);
    assert.equal(parsed.categories[0].name, "Tests");
  } finally {
    server.close();
  }
});

test("cli gives a clear error for a --category typo instead of silently scoring nothing", async () => {
  const { server, baseUrl } = await startMockGitHub();
  try {
    const result = await runCli(["octocat/healthy", "--json", "--category", "Tset"], baseUrl);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unknown --category "Tset"/);
    assert.match(result.stderr, /Tests/);
  } finally {
    server.close();
  }
});

test("cli paginates through more than one page of issues instead of only seeing the first 100", async () => {
  const { server, baseUrl } = await startMockGitHub();
  try {
    const result = await runCli(
      ["octocat/many-stale-issues", "--json", "--category", "Issue Management"],
      baseUrl,
    );
    const parsed = JSON.parse(result.stdout);
    const finding = parsed.categories[0].findings.find((f: { label: string }) =>
      f.label.includes("stale open issues"),
    );
    assert.match(finding.detail, /150\/150/);
  } finally {
    server.close();
  }
});

test("cli doesn't let a large volume of old closed issues crowd open issues out of the paginated window", async () => {
  const { server, baseUrl } = await startMockGitHub();
  try {
    const result = await runCli(
      ["octocat/old-closed-history", "--json", "--category", "Issue Management"],
      baseUrl,
    );
    const parsed = JSON.parse(result.stdout);
    const finding = parsed.categories[0].findings.find((f: { label: string }) =>
      f.label.includes("stale open issues"),
    );
    assert.match(finding.detail, /20\/20/);
  } finally {
    server.close();
  }
});

test("cli doesn't count cancelled or skipped workflow runs as CI failures", async () => {
  const { server, baseUrl } = await startMockGitHub();
  try {
    const result = await runCli(
      ["octocat/cancelled-runs", "--json", "--category", "Continuous Integration"],
      baseUrl,
    );
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.categories[0].score, parsed.categories[0].maxScore);
  } finally {
    server.close();
  }
});

test("cli reports a clear error for a repo that doesn't exist", async () => {
  const { server, baseUrl } = await startMockGitHub();
  try {
    const result = await runCli(["octocat/does-not-exist"], baseUrl);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /404/);
  } finally {
    server.close();
  }
});

test("cli rejects a malformed repo argument before touching the network", async () => {
  const result = await runCli(["not-a-slug"], "http://127.0.0.1:1");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /doesn't look like/);
});

test("cli --help exits 0 without a repo", async () => {
  const result = await runCli(["--help"], "http://127.0.0.1:1");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /repo-health/);
});
