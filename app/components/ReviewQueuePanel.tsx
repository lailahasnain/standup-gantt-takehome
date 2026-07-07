"use client";

import { daysWaiting, type ReviewQueueGroup } from "@/lib/gantt/reviewQueue";
import { Modal } from "./Modal";
import styles from "../panels.module.css";

function staleness(days: number): "fresh" | "aging" | "stale" {
  if (days >= 5) return "stale";
  if (days >= 2) return "aging";
  return "fresh";
}

export function ReviewQueuePanel({
  groups,
  now,
  onClose,
}: {
  groups: ReviewQueueGroup[];
  now: Date;
  onClose: () => void;
}) {
  const total = groups.reduce((sum, g) => sum + g.entries.length, 0);

  return (
    <Modal onClose={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-queue-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelTitle} id="review-queue-title">
              Review queue
            </p>
            <p className={styles.panelSubtitle}>
              {total} pending review{total === 1 ? "" : "s"}, oldest requests first
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.panelBody}>
          {groups.length === 0 && <p className={styles.hint}>Nobody's waiting on a review right now.</p>}

          {groups.map((group) => (
            <div key={group.reviewerName} className={styles.field}>
              <span className={styles.label}>{group.reviewerName}</span>
              <div className={styles.prList}>
                {group.entries.map((entry) => {
                  const days = daysWaiting(entry.requestedAt, now);
                  const level = staleness(days);
                  return (
                    <div
                      key={`${entry.repoName}#${entry.prNumber}`}
                      className={styles.prCard}
                    >
                      <div className={styles.prCardHeader}>
                        <a href={entry.prUrl} target="_blank" rel="noreferrer">
                          {entry.issueIdentifier} &middot; {entry.repoName}#{entry.prNumber}
                        </a>
                        <span className={`${styles.badge} ${styles["stale-" + level]}`}>
                          {days === 0 ? "today" : `${days}d waiting`}
                        </span>
                      </div>
                      <span className={styles.hint}>{entry.issueTitle}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
