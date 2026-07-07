import {
  FAKE_GITHUB_REPOS,
  type FakeGithubRepo,
  type RawGithubPullRequestNode,
  type RawLinearIssueNode,
} from "@/lib/fake-source/seed";

const ISSUES_QUERY = `
  query GanttIssues {
    issues {
      nodes {
        id identifier title url startedAt dueDate
        state { name }
        assignee { id name displayName email }
        project { id name }
        projectMilestone { id name }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const PULL_REQUESTS_QUERY = `
  query GanttPullRequests($owner: String!, $name: String!, $state: PullRequestState!) {
    repository(owner: $owner, name: $name) {
      pullRequests(states: [$state]) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number title state createdAt mergedAt closedAt updatedAt headRefName baseRefName url
          author { login }
          commits(first: 1) { nodes { commit { committedDate authoredDate } } }
          reviews(first: 100) { nodes { author { login } state submittedAt } }
          timelineItems(first: 100, itemTypes: [REVIEW_REQUESTED_EVENT, REVIEW_REQUEST_REMOVED_EVENT]) {
            nodes {
              __typename
              ... on ReviewRequestedEvent { createdAt requestedReviewer { ... on User { login } ... on Bot { login } } }
              ... on ReviewRequestRemovedEvent { createdAt requestedReviewer { ... on User { login } ... on Bot { login } } }
            }
          }
        }
      }
    }
  }
`;

const ISSUE_CREATE_MUTATION = `
  mutation GanttIssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id identifier title url startedAt dueDate
        state { name }
        assignee { id name displayName email }
        project { id name }
        projectMilestone { id name }
      }
    }
  }
`;

const ISSUE_UPDATE_MUTATION = `
  mutation GanttIssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id identifier title url startedAt dueDate
        state { name }
        assignee { id name displayName email }
        project { id name }
        projectMilestone { id name }
      }
    }
  }
`;

interface GraphQLEnvelope<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function postGraphql<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLEnvelope<T>> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`${endpoint} responded ${res.status}`);
  }
  return res.json();
}

export async function fetchLinearIssues(): Promise<RawLinearIssueNode[]> {
  const envelope = await postGraphql<{ issues: { nodes: RawLinearIssueNode[] } }>(
    "/api/fake/linear",
    ISSUES_QUERY
  );
  if (envelope.errors?.length) {
    throw new Error(`fake-Linear: ${envelope.errors.map((e) => e.message).join("; ")}`);
  }
  return envelope.data?.issues.nodes ?? [];
}

export interface TaggedPr {
  repo: FakeGithubRepo;
  node: RawGithubPullRequestNode;
}

// OPEN + MERGED only across both repos -- CLOSED is just noise for a standup view.
export async function fetchGithubPullRequests(): Promise<TaggedPr[]> {
  const requests = FAKE_GITHUB_REPOS.flatMap((repo) =>
    (["OPEN", "MERGED"] as const).map((state) => ({ repo, state }))
  );

  const pages = await Promise.all(
    requests.map(async ({ repo, state }) => {
      const envelope = await postGraphql<{
        repository: { pullRequests: { nodes: RawGithubPullRequestNode[] } } | null;
      }>(
        "/api/fake/github",
        PULL_REQUESTS_QUERY,
        { owner: repo.owner, name: repo.name, state }
      );
      if (envelope.errors?.length && !envelope.data?.repository) {
        throw new Error(`fake-GitHub: ${envelope.errors.map((e) => e.message).join("; ")}`);
      }
      const nodes = envelope.data?.repository?.pullRequests.nodes ?? [];
      return nodes.map((node) => ({ repo, node }));
    })
  );

  return pages.flat();
}

export interface IssueCreateInput {
  title: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  stateId?: string;
}

export async function createIssue(input: IssueCreateInput): Promise<RawLinearIssueNode> {
  const envelope = await postGraphql<{ issueCreate: { success: boolean; issue: RawLinearIssueNode } }>(
    "/api/fake/linear",
    ISSUE_CREATE_MUTATION,
    { input }
  );
  if (envelope.errors?.length) {
    throw new Error(`fake-Linear: ${envelope.errors.map((e) => e.message).join("; ")}`);
  }
  return envelope.data!.issueCreate.issue;
}

export interface IssueUpdateInput {
  title?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  stateId?: string;
}

export async function updateIssue(id: string, input: IssueUpdateInput): Promise<RawLinearIssueNode> {
  const envelope = await postGraphql<{ issueUpdate: { success: boolean; issue: RawLinearIssueNode } }>(
    "/api/fake/linear",
    ISSUE_UPDATE_MUTATION,
    { id, input }
  );
  if (envelope.errors?.length) {
    throw new Error(`fake-Linear: ${envelope.errors.map((e) => e.message).join("; ")}`);
  }
  return envelope.data!.issueUpdate.issue;
}
