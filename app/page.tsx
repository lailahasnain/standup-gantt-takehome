"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createIssue, fetchGithubPullRequests, fetchLinearIssues, updateIssue, type IssueCreateInput } from "@/lib/gantt/client";
import { normalize } from "@/lib/gantt/normalize";
import { usePlannedStarts } from "@/lib/gantt/usePlannedStart";
import { buildReviewQueue } from "@/lib/gantt/reviewQueue";
import { BoardSkeleton } from "./components/BoardSkeleton";
import { GanttBoard } from "./components/GanttBoard";
import { IssueDetailPanel } from "./components/IssueDetailPanel";
import { NewIssueDialog } from "./components/NewIssueDialog";
import { ReviewQueuePanel } from "./components/ReviewQueuePanel";
import { StatusLegend } from "./components/StatusLegend";
import styles from "./gantt.module.css";
import panelStyles from "./panels.module.css";

type ActiveModal = { type: "issue"; issueId: string } | { type: "newIssue" } | { type: "reviewQueue" } | null;

export default function StandupGanttPage() {
  const [rawIssues, setRawIssues] = useState<Awaited<ReturnType<typeof fetchLinearIssues>> | null>(null);
  const [rawPrs, setRawPrs] = useState<Awaited<ReturnType<typeof fetchGithubPullRequests>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  // One tagged state so only one dialog can ever be open at a time.
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const { plannedStarts, setPlannedStart } = usePlannedStarts();

  const load = useCallback(() => {
    setError(null);
    Promise.all([fetchLinearIssues(), fetchGithubPullRequests()])
      .then(([issues, prs]) => {
        setRawIssues(issues);
        setRawPrs(prs);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = useMemo(() => new Date(), []);
  const result = useMemo(
    () => (rawIssues && rawPrs ? normalize(rawIssues, rawPrs) : null),
    [rawIssues, rawPrs]
  );

  const selectedIssue = useMemo(
    () =>
      activeModal?.type === "issue"
        ? (result?.issues.find((i) => i.id === activeModal.issueId) ?? null)
        : null,
    [result, activeModal]
  );

  const reviewQueue = useMemo(() => (result ? buildReviewQueue(result.issues) : []), [result]);
  const pendingReviewCount = reviewQueue.reduce((sum, g) => sum + g.entries.length, 0);

  async function handleCreate(input: IssueCreateInput) {
    await createIssue(input);
    load();
  }

  async function handleUpdateState(stateName: string) {
    if (!selectedIssue) return;
    await updateIssue(selectedIssue.id, { stateId: stateName });
    load();
  }

  async function handleUpdateDueDate(date: string | null) {
    if (!selectedIssue) return;
    await updateIssue(selectedIssue.id, { dueDate: date });
    load();
  }

  async function handleUpdateAssignee(assigneeId: string | null) {
    if (!selectedIssue) return;
    await updateIssue(selectedIssue.id, { assigneeId });
    load();
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Standup Gantt</h1>
          <p className={styles.subtitle}>Orbital team &middot; issues and pull requests, grouped by person</p>
        </div>
        <div className={styles.headerActions}>
          <StatusLegend />
          <button
            type="button"
            className={panelStyles.queueButton}
            onClick={() => setActiveModal({ type: "reviewQueue" })}
          >
            Review queue
            {pendingReviewCount > 0 && <span className={panelStyles.queueBadge}>{pendingReviewCount}</span>}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setActiveModal({ type: "newIssue" })}
          >
            + New issue
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorState}>
          <p>Couldn&apos;t load the board: {error}</p>
          <button type="button" className={styles.primaryButton} onClick={load}>
            Retry
          </button>
        </div>
      )}

      {!error && !result && <BoardSkeleton />}

      {!error && result && result.people.length === 0 && (
        <div className={styles.emptyState}>No issues yet. Create the first one to get started.</div>
      )}

      {!error && result && result.people.length > 0 && (
        <GanttBoard
          people={result.people}
          plannedStarts={plannedStarts}
          now={now}
          selectedIssueId={activeModal?.type === "issue" ? activeModal.issueId : null}
          onSelectIssue={(issueId) => setActiveModal({ type: "issue", issueId })}
        />
      )}

      {selectedIssue && (
        <IssueDetailPanel
          issue={selectedIssue}
          plannedStart={plannedStarts[selectedIssue.id] ?? null}
          onSetPlannedStart={(date) => setPlannedStart(selectedIssue.id, date)}
          onUpdateState={handleUpdateState}
          onUpdateDueDate={handleUpdateDueDate}
          onUpdateAssignee={handleUpdateAssignee}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === "newIssue" && (
        <NewIssueDialog onCreate={handleCreate} onClose={() => setActiveModal(null)} />
      )}

      {activeModal?.type === "reviewQueue" && (
        <ReviewQueuePanel groups={reviewQueue} now={now} onClose={() => setActiveModal(null)} />
      )}
    </main>
  );
}
