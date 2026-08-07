export type RepoInfo = {
  full_name: string;
  description: string | null;
  license: { spdx_id: string } | null;
  has_issues: boolean;
  open_issues_count: number;
  stargazers_count: number;
  pushed_at: string;
  created_at: string;
  archived: boolean;
  default_branch: string;
  topics: string[];
};

export type CommunityProfile = {
  health_percentage: number;
  files: {
    readme: { url: string } | null;
    license: { url: string } | null;
    contributing: { url: string } | null;
    code_of_conduct: { url: string } | null;
    issue_template: { url: string } | null;
    pull_request_template: { url: string } | null;
  };
};

export type TreeEntry = {
  path: string;
  type: "blob" | "tree";
};

export type Workflow = {
  id: number;
  name: string;
  path: string;
  state: string;
};

export type WorkflowRun = {
  conclusion: string | null;
  status: string;
  created_at: string;
};

export type Release = {
  tag_name: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
};

export type Tag = {
  name: string;
};

export type Issue = {
  number: number;
  state: string;
  created_at: string;
  closed_at: string | null;
  updated_at: string;
  pull_request?: unknown;
};

export type GitHubClientOptions = {
  token?: string;
  baseUrl?: string;
};

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export interface GitHubClientLike {
  getRepo(owner: string, repo: string): Promise<RepoInfo>;
  getCommunityProfile(owner: string, repo: string): Promise<CommunityProfile | null>;
  getTree(owner: string, repo: string, branch: string): Promise<TreeEntry[]>;
  getWorkflows(owner: string, repo: string): Promise<Workflow[]>;
  getWorkflowRuns(owner: string, repo: string): Promise<WorkflowRun[]>;
  getReleases(owner: string, repo: string): Promise<Release[]>;
  getTags(owner: string, repo: string): Promise<Tag[]>;
  getIssues(owner: string, repo: string): Promise<Issue[]>;
  getFileContent(owner: string, repo: string, path: string): Promise<string | null>;
}

export class GitHubClient implements GitHubClientLike {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: GitHubClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://api.github.com";
    this.headers = {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "repo-health-score-cli",
    };
    if (options.token) {
      this.headers.authorization = `Bearer ${options.token}`;
    }
  }

  private async get<T>(path: string, allow404 = false): Promise<T | null> {
    const response = await fetch(`${this.baseUrl}${path}`, { headers: this.headers });

    if (response.status === 404 && allow404) {
      return null;
    }

    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        throw new GitHubApiError(
          "GitHub API rate limit hit. Pass --token or set GITHUB_TOKEN for a much higher limit.",
          response.status,
        );
      }
    }

    if (!response.ok) {
      throw new GitHubApiError(`GitHub API request to ${path} failed: ${response.status} ${response.statusText}`, response.status);
    }

    return (await response.json()) as T;
  }

  async getRepo(owner: string, repo: string): Promise<RepoInfo> {
    const data = await this.get<RepoInfo>(`/repos/${owner}/${repo}`);
    if (!data) throw new GitHubApiError(`Repository ${owner}/${repo} not found`, 404);
    return data;
  }

  async getCommunityProfile(owner: string, repo: string): Promise<CommunityProfile | null> {
    return this.get<CommunityProfile>(`/repos/${owner}/${repo}/community/profile`, true);
  }

  async getTree(owner: string, repo: string, branch: string): Promise<TreeEntry[]> {
    const data = await this.get<{ tree: TreeEntry[]; truncated: boolean }>(
      `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      true,
    );
    return data?.tree ?? [];
  }

  async getWorkflows(owner: string, repo: string): Promise<Workflow[]> {
    const data = await this.get<{ workflows: Workflow[] }>(`/repos/${owner}/${repo}/actions/workflows`, true);
    return data?.workflows ?? [];
  }

  async getWorkflowRuns(owner: string, repo: string): Promise<WorkflowRun[]> {
    const data = await this.get<{ workflow_runs: WorkflowRun[] }>(
      `/repos/${owner}/${repo}/actions/runs?per_page=20`,
      true,
    );
    return data?.workflow_runs ?? [];
  }

  async getReleases(owner: string, repo: string): Promise<Release[]> {
    const data = await this.get<Release[]>(`/repos/${owner}/${repo}/releases?per_page=10`, true);
    return data ?? [];
  }

  async getTags(owner: string, repo: string): Promise<Tag[]> {
    const data = await this.get<Tag[]>(`/repos/${owner}/${repo}/tags?per_page=10`, true);
    return data ?? [];
  }

  async getIssues(owner: string, repo: string): Promise<Issue[]> {
    const data = await this.get<Issue[]>(
      `/repos/${owner}/${repo}/issues?state=all&per_page=50&sort=updated`,
      true,
    );
    return (data ?? []).filter((issue) => !("pull_request" in issue) || !issue.pull_request);
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    const data = await this.get<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/contents/${path}`,
      true,
    );
    if (!data || data.encoding !== "base64") return null;
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
}
