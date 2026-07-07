// Raw Linear issues + raw GitHub PRs -> NormalizedIssue[].

import { AUTOMATION_OWNED_STATES, TEAM, type RawLinearIssueNode } from "@/lib/fake-source/seed";
import type { TaggedPr } from "./client";
import {
  REVIEW_STATE_SEVERITY,
  type NormalizedIssue,
  type NormalizedPr,
  type NormalizedReviewer,
  type PersonGroup,
  type ReviewState,
  type StatusFamily,
} from "./types";

const TEAM_BY_LOGIN = new Map(Object.values(TEAM).map((m) => [m.githubLogin, m]));

// Anything that doesn't resolve to a teammate is a bot or outside contributor.
function resolveActor(login: string | null): { id: string; name: string } | null {
  if (!login) return null;
  const member = TEAM_BY_LOGIN.get(login);
  return member ? { id: member.id, name: member.name } : null;
}

// Branch first (Linear's auto-branch names embed `orb-<number>`), title as fallback.
function matchIssueIdentifier(headRefName: string, title: string): string | null {
  const branchMatch = headRefName.match(/orb-(\d+)/i);
  if (branchMatch) return `ORB-${branchMatch[1]}`;
  const titleMatch = title.match(/orb-(\d+)/i);
  if (titleMatch) return `ORB-${titleMatch[1]}`;
  return null;
}

function worstReviewState(states: ReviewState[]): ReviewState | null {
  if (states.length === 0) return null;
  return states.reduce((worst, s) =>
    REVIEW_STATE_SEVERITY[s] > REVIEW_STATE_SEVERITY[worst] ? s : worst
  );
}

// A reviewer's latest request event wins (so a stale approval before a re-request
// doesn't count); no submission after that + OPEN = pending, + MERGED/CLOSED = mooted.
function resolveReviewers(node: TaggedPr["node"]): NormalizedReviewer[] {
  const latestEventByLogin = new Map<string, { type: "requested" | "removed"; at: number }>();
  for (const item of node.timelineItems.nodes) {
    const login = item.requestedReviewer?.login;
    if (!login) continue;
    const at = new Date(item.createdAt).getTime();
    const existing = latestEventByLogin.get(login);
    if (!existing || at >= existing.at) {
      latestEventByLogin.set(login, {
        type: item.__typename === "ReviewRequestedEvent" ? "requested" : "removed",
        at,
      });
    }
  }

  const reviewers: NormalizedReviewer[] = [];

  for (const [login, event] of latestEventByLogin) {
    if (event.type === "removed") continue; // no active obligation from this reviewer
    const actor = resolveActor(login);
    if (!actor) continue; // bot reviewer, filtered

    const submission = node.reviews.nodes
      .filter((r) => r.author?.login === login && r.submittedAt && new Date(r.submittedAt).getTime() > event.at)
      .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())[0];

    const requestedAt = new Date(event.at).toISOString();

    if (submission) {
      const state: ReviewState =
        submission.state === "DISMISSED" ? "COMMENTED" : (submission.state as ReviewState);
      reviewers.push({ login, name: actor.name, state, requestedAt });
    } else if (node.state === "OPEN") {
      reviewers.push({ login, name: actor.name, state: "PENDING", requestedAt });
    }
    // else: request never satisfied and the PR is MERGED/CLOSED -- mooted, dropped.
  }

  return reviewers;
}

function normalizePr(tagged: TaggedPr): NormalizedPr {
  const { repo, node } = tagged;
  const author = resolveActor(node.author?.login ?? null);
  const reviewers = resolveReviewers(node);
  const commitDate = node.commits.nodes[0]?.commit.committedDate ?? node.createdAt;

  return {
    repoOwner: repo.owner,
    repoName: repo.name,
    number: node.number,
    title: node.title,
    url: node.url,
    state: node.state,
    authorLogin: node.author?.login ?? null,
    authorName: author?.name ?? null,
    authorId: author?.id ?? null,
    isOutsideAuthor: node.author != null && author == null,
    createdAt: node.createdAt,
    mergedAt: node.mergedAt,
    commitDate,
    reviewers,
    aggregateState: worstReviewState(reviewers.map((r) => r.state)),
    stackParent: null, // filled in by linkStacks
    stackDepth: 0,
  };
}

// Groups PRs whose baseRefName matches another's headRefName in the same repo.
function linkStacks(prs: NormalizedPr[], rawByKey: Map<string, TaggedPr["node"]>): void {
  const headKey = (owner: string, name: string, head: string) => `${owner}/${name}#${head}`;
  const headIndex = new Map<string, NormalizedPr>();
  for (const pr of prs) {
    const raw = rawByKey.get(`${pr.repoOwner}/${pr.repoName}#${pr.number}`);
    if (raw) headIndex.set(headKey(pr.repoOwner, pr.repoName, raw.headRefName), pr);
  }

  for (const pr of prs) {
    const raw = rawByKey.get(`${pr.repoOwner}/${pr.repoName}#${pr.number}`);
    if (!raw || raw.baseRefName === "main") continue;
    const parent = headIndex.get(headKey(pr.repoOwner, pr.repoName, raw.baseRefName));
    if (parent) {
      pr.stackParent = { repoOwner: parent.repoOwner, repoName: parent.repoName, number: parent.number };
      pr.stackDepth = parent.stackDepth + 1;
    }
  }
}

function statusFamilyFor(state: { name: string }, startedAt: string | null): StatusFamily {
  const name = state.name;
  if (name === "Canceled") return "cancelled";
  if (name === "Done") return "done";
  if (AUTOMATION_OWNED_STATES.has(name)) {
    if (name === "In Progress") return "active";
    if (name === "In Review") return "review";
    return "deployed"; // On Develop / On Staging / On Prod
  }
  return startedAt ? "active" : "planned";
}

export interface NormalizeResult {
  issues: NormalizedIssue[];
  people: PersonGroup[];
}

export function normalize(rawIssues: RawLinearIssueNode[], rawPrs: TaggedPr[]): NormalizeResult {
  const byIdentifier = new Map<string, NormalizedIssue>();
  for (const raw of rawIssues) {
    byIdentifier.set(raw.identifier, {
      id: raw.id,
      identifier: raw.identifier,
      title: raw.title,
      url: raw.url,
      stateName: raw.state?.name ?? "Unknown",
      statusFamily: statusFamilyFor(raw.state ?? { name: "Unknown" }, raw.startedAt),
      assigneeId: raw.assignee?.id ?? null,
      assigneeName: raw.assignee?.name ?? null,
      projectName: raw.project?.name ?? null,
      milestoneName: raw.projectMilestone?.name ?? null,
      startedAt: raw.startedAt,
      dueDate: raw.dueDate,
      prs: [],
      reviewAggregate: null,
    });
  }

  const rawByKey = new Map(rawPrs.map((t) => [`${t.repo.owner}/${t.repo.name}#${t.node.number}`, t.node]));
  const normalizedPrs = rawPrs.map(normalizePr);
  linkStacks(normalizedPrs, rawByKey);

  const orphanPrs: NormalizedPr[] = [];
  for (let i = 0; i < rawPrs.length; i++) {
    const raw = rawPrs[i].node;
    const identifier = matchIssueIdentifier(raw.headRefName, raw.title);
    const issue = identifier ? byIdentifier.get(identifier) : undefined;
    if (issue) {
      issue.prs.push(normalizedPrs[i]);
    } else {
      orphanPrs.push(normalizedPrs[i]);
    }
  }

  const people = new Map<string, PersonGroup>();
  for (const issue of byIdentifier.values()) {
    issue.prs.sort((a, b) => a.stackDepth - b.stackDepth);
    issue.reviewAggregate = worstReviewState(
      issue.prs.map((p) => p.aggregateState).filter((s): s is ReviewState => s != null)
    );

    const key = issue.assigneeId ?? "unassigned";
    const name = issue.assigneeName ?? "Unassigned";
    if (!people.has(key)) people.set(key, { id: key, name, issues: [], orphanPrs: [] });
    people.get(key)!.issues.push(issue);
  }

  // Orphan PRs authored by someone outside the roster (bot/outside-contributor/ghost)
  // have no person to attach to and are dropped here -- a team member's unlinked PR
  // is still worth a standup asking about, but an outsider's isn't ours to track.
  for (const pr of orphanPrs) {
    if (!pr.authorId) continue;
    if (!people.has(pr.authorId)) {
      people.set(pr.authorId, { id: pr.authorId, name: pr.authorName!, issues: [], orphanPrs: [] });
    }
    people.get(pr.authorId)!.orphanPrs.push(pr);
  }

  return {
    issues: [...byIdentifier.values()],
    people: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
