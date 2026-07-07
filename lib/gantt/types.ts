// Normalized types produced by lib/gantt/normalize.ts -- not wire shapes.

export type StatusFamily = "planned" | "active" | "review" | "deployed" | "done" | "cancelled";

export type ReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING";

// Worst-in-the-set wins, for both a PR's reviewers and an issue's PR stack.
export const REVIEW_STATE_SEVERITY: Record<ReviewState, number> = {
  CHANGES_REQUESTED: 4,
  PENDING: 3,
  COMMENTED: 2,
  APPROVED: 1,
};

export interface NormalizedReviewer {
  login: string;
  name: string;
  state: ReviewState;
  /** Most recent active request -- used to rank the review queue by staleness. */
  requestedAt: string;
}

export interface NormalizedPr {
  repoOwner: string;
  repoName: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  authorLogin: string | null;
  authorName: string | null;
  authorId: string | null;
  /** True when the author didn't resolve to a teammate (outside contributor / ghost). */
  isOutsideAuthor: boolean;
  createdAt: string;
  mergedAt: string | null;
  /** First-commit date -- used as the PR's own start edge. */
  commitDate: string;
  reviewers: NormalizedReviewer[];
  /** Worst reviewer state on this PR alone, or null if nobody's been asked. */
  aggregateState: ReviewState | null;
  /** Set when this PR's base branch is another seeded PR's head branch (a stack). */
  stackParent: { repoOwner: string; repoName: string; number: number } | null;
  /** Position in the stack, 0 = base of the chain. */
  stackDepth: number;
}

export interface NormalizedIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  stateName: string;
  statusFamily: StatusFamily;
  assigneeId: string | null;
  assigneeName: string | null;
  projectName: string | null;
  milestoneName: string | null;
  startedAt: string | null;
  dueDate: string | null;
  prs: NormalizedPr[];
  /** Worst PR aggregate across the whole issue (its full PR stack), or null if no PRs. */
  reviewAggregate: ReviewState | null;
}

export interface PersonGroup {
  id: string;
  name: string;
  issues: NormalizedIssue[];
  /** PRs authored by this person with no resolvable Linear identifier. */
  orphanPrs: NormalizedPr[];
}

export const STATUS_FAMILY_LABEL: Record<StatusFamily, string> = {
  planned: "Planned",
  active: "Active",
  review: "In review",
  deployed: "Deployed",
  done: "Done",
  cancelled: "Cancelled",
};

export const STATUS_FAMILY_ORDER: StatusFamily[] = [
  "planned",
  "active",
  "review",
  "deployed",
  "done",
  "cancelled",
];

export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
  COMMENTED: "Commented",
  PENDING: "Pending",
};
