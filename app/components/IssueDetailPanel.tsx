"use client";

import { useEffect, useState } from "react";
import { AUTOMATION_OWNED_STATES, TEAM } from "@/lib/fake-source/seed";
import type { NormalizedIssue, ReviewState } from "@/lib/gantt/types";
import { REVIEW_STATE_LABEL } from "@/lib/gantt/types";
import { Modal } from "./Modal";
import styles from "../panels.module.css";
import ganttStyles from "../gantt.module.css";

const STATE_OPTIONS = [
  "Backlog",
  "Triage",
  "Selected For Development",
  "Todo",
  "Design Exploration",
  "In Progress",
  "In Review",
  "On Develop",
  "On Staging",
  "On Prod",
  "Done",
  "Canceled",
];

const REVIEW_STATE_CLASS: Record<ReviewState, string> = {
  APPROVED: "stateApproved",
  CHANGES_REQUESTED: "stateChangesRequested",
  COMMENTED: "stateCommented",
  PENDING: "statePending",
};

export function IssueDetailPanel({
  issue,
  plannedStart,
  onSetPlannedStart,
  onUpdateState,
  onUpdateDueDate,
  onUpdateAssignee,
  onClose,
}: {
  issue: NormalizedIssue;
  plannedStart: string | null;
  onSetPlannedStart: (date: string | null) => void;
  onUpdateState: (stateName: string) => Promise<void>;
  onUpdateDueDate: (date: string | null) => Promise<void>;
  onUpdateAssignee: (assigneeId: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!savedFlash) return;
    const timer = setTimeout(() => setSavedFlash(null), 1500);
    return () => clearTimeout(timer);
  }, [savedFlash]);

  async function handleStateChange(stateName: string) {
    // Our fake store won't stamp startedAt the way real automation would, so this
    // would otherwise land as an "active" bar with nowhere to put it.
    if (AUTOMATION_OWNED_STATES.has(stateName) && !issue.startedAt && !plannedStart) {
      setError(
        `Set a planned start before moving this to "${stateName}" -- otherwise it has no start data to place it on the timeline.`
      );
      document.getElementById("planned-start")?.focus();
      return;
    }
    setSaving("state");
    setError(null);
    try {
      await onUpdateState(stateName);
      setSavedFlash("state");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  }

  async function handleDueDateChange(value: string) {
    setSaving("due");
    setError(null);
    try {
      await onUpdateDueDate(value || null);
      setSavedFlash("due");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  }

  async function handleAssigneeChange(value: string) {
    setSaving("assignee");
    setError(null);
    try {
      await onUpdateAssignee(value || null);
      setSavedFlash("assignee");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelTitle} id="issue-panel-title">
              {issue.title}
            </p>
            <p className={styles.panelSubtitle}>
              <a href={issue.url} target="_blank" rel="noreferrer">
                {issue.identifier}
              </a>
              {issue.projectName ? ` · ${issue.projectName}` : ""}
              {issue.milestoneName ? ` · ${issue.milestoneName}` : ""}
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.panelBody}>
          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="state-select">
                Status {savedFlash === "state" && <span className={styles.savedFlash}>Saved</span>}
              </label>
              <select
                id="state-select"
                className={styles.select}
                value={issue.stateName}
                disabled={saving === "state"}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                {STATE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="due-date">
                Due date {savedFlash === "due" && <span className={styles.savedFlash}>Saved</span>}
              </label>
              <input
                id="due-date"
                type="date"
                className={styles.input}
                defaultValue={issue.dueDate ?? ""}
                disabled={saving === "due"}
                onBlur={(e) => handleDueDateChange(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="assignee-select">
              Assignee {savedFlash === "assignee" && <span className={styles.savedFlash}>Saved</span>}
            </label>
            <select
              id="assignee-select"
              className={styles.select}
              value={issue.assigneeId ?? ""}
              disabled={saving === "assignee"}
              onChange={(e) => handleAssigneeChange(e.target.value)}
            >
              {!issue.assigneeId && (
                <option value="" disabled>
                  Unassigned
                </option>
              )}
              {Object.values(TEAM).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <span className={styles.hint}>
              Reassign to a teammate -- fake-Linear can't clear an assignee once one is set.
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="planned-start">
              Planned start (local, not synced to Linear)
            </label>
            <input
              id="planned-start"
              type="date"
              className={styles.input}
              value={plannedStart ?? ""}
              disabled={!!issue.startedAt}
              onChange={(e) => onSetPlannedStart(e.target.value || null)}
            />
            <span className={styles.hint}>
              {issue.startedAt
                ? `Actually started ${new Date(issue.startedAt).toLocaleDateString()}.`
                : "No writable start date in Linear -- this is your own plan, kept in this browser only."}
            </span>
          </div>

          {issue.prs.length > 0 && (
            <div className={styles.field}>
              <span className={styles.label}>Pull requests</span>
              <div className={styles.prList}>
                {issue.prs.map((pr) => (
                  <div key={`${pr.repoOwner}/${pr.repoName}#${pr.number}`} className={styles.prCard}>
                    <div className={styles.prCardHeader}>
                      <a href={pr.url} target="_blank" rel="noreferrer">
                        {pr.repoName}#{pr.number}
                      </a>
                      {pr.aggregateState && (
                        <span className={`${styles.badge} ${ganttStyles[REVIEW_STATE_CLASS[pr.aggregateState]]}`}>
                          {REVIEW_STATE_LABEL[pr.aggregateState]}
                        </span>
                      )}
                    </div>
                    <span className={styles.hint}>
                      {pr.title} · {pr.state.toLowerCase()}
                      {pr.isOutsideAuthor ? " · outside contributor" : ""}
                    </span>
                    {pr.stackParent && (
                      <p className={styles.stackNote}>Stacked on #{pr.stackParent.number}</p>
                    )}
                    {pr.reviewers.length > 0 && (
                      <div className={styles.reviewerList}>
                        {pr.reviewers.map((r) => (
                          <span key={r.login} className={styles.reviewerChip}>
                            {r.name}: {REVIEW_STATE_LABEL[r.state]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.panelFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
