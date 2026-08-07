import type {
  CommunityProfile,
  GitHubClientLike,
  Issue,
  Release,
  RepoInfo,
  Tag,
  Workflow,
  WorkflowRun,
} from "../github.js";
import type { CheckContext } from "../checks/index.js";

export function fakeRepoInfo(overrides: Partial<RepoInfo> = {}): RepoInfo {
  return {
    full_name: "octocat/hello-world",
    description: "A friendly test repo",
    license: { spdx_id: "MIT" },
    has_issues: true,
    open_issues_count: 0,
    stargazers_count: 10,
    pushed_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    archived: false,
    default_branch: "main",
    topics: [],
    ...overrides,
  };
}

export function fakeCommunityProfile(overrides: Partial<CommunityProfile["files"]> = {}): CommunityProfile {
  return {
    health_percentage: 100,
    files: {
      readme: { url: "readme" },
      license: { url: "license" },
      contributing: { url: "contributing" },
      code_of_conduct: { url: "coc" },
      issue_template: { url: "issue" },
      pull_request_template: { url: "pr" },
      ...overrides,
    },
  };
}

type FakeClientData = {
  workflows?: Workflow[];
  workflowRuns?: WorkflowRun[];
  releases?: Release[];
  tags?: Tag[];
  issues?: Issue[];
  files?: Record<string, string>;
};

export function fakeClient(data: FakeClientData = {}): GitHubClientLike {
  return {
    getRepo: async () => fakeRepoInfo(),
    getCommunityProfile: async () => fakeCommunityProfile(),
    getTree: async () => [],
    getWorkflows: async () => data.workflows ?? [],
    getWorkflowRuns: async () => data.workflowRuns ?? [],
    getReleases: async () => data.releases ?? [],
    getTags: async () => data.tags ?? [],
    getIssues: async () => data.issues ?? [],
    getFileContent: async (_owner, _repo, path) => data.files?.[path] ?? null,
  };
}

export function fakeContext(overrides: Partial<CheckContext> = {}, clientData: FakeClientData = {}): CheckContext {
  return {
    client: fakeClient(clientData),
    owner: "octocat",
    repo: "hello-world",
    repoInfo: fakeRepoInfo(),
    tree: [],
    communityProfile: fakeCommunityProfile(),
    ...overrides,
  };
}
