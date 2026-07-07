// Flattens every PENDING reviewer obligation into a per-reviewer worklist, ranked by
// staleness -- so "which PRs need attention" doesn't mean scanning every bar by hand.

import type { NormalizedIssue } from "./types";

export interface ReviewQueueEntry {
  reviewerLogin: string;
  reviewerName: string;
  issueIdentifier: string;
  issueTitle: string;
  repoName: string;
  prNumber: number;
  prUrl: string;
  requestedAt: string;
}

export interface ReviewQueueGroup {
  reviewerName: string;
  /** Sorted oldest-request-first: the most stale obligation leads each person's list. */
  entries: ReviewQueueEntry[];
}

export function buildReviewQueue(issues: NormalizedIssue[]): ReviewQueueGroup[] {
  const entries: ReviewQueueEntry[] = [];

  for (const issue of issues) {
    for (const pr of issue.prs) {
      for (const reviewer of pr.reviewers) {
        if (reviewer.state !== "PENDING") continue;
        entries.push({
          reviewerLogin: reviewer.login,
          reviewerName: reviewer.name,
          issueIdentifier: issue.identifier,
          issueTitle: issue.title,
          repoName: pr.repoName,
          prNumber: pr.number,
          prUrl: pr.url,
          requestedAt: reviewer.requestedAt,
        });
      }
    }
  }

  const byReviewer = new Map<string, ReviewQueueEntry[]>();
  for (const entry of entries) {
    const list = byReviewer.get(entry.reviewerName) ?? [];
    list.push(entry);
    byReviewer.set(entry.reviewerName, list);
  }

  return [...byReviewer.entries()]
    .map(([reviewerName, list]) => ({
      reviewerName,
      entries: list.sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()),
    }))
    .sort((a, b) => new Date(a.entries[0].requestedAt).getTime() - new Date(b.entries[0].requestedAt).getTime());
}

export function daysWaiting(requestedAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(requestedAt).getTime()) / 86_400_000));
}
