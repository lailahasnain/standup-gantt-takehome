import type { IssueSpan } from "@/lib/gantt/timeline";
import { DAY_WIDTH_PX } from "@/lib/gantt/timeline";
import type { NormalizedIssue, ReviewState } from "@/lib/gantt/types";
import styles from "../gantt.module.css";

const REVIEW_STATE_CLASS: Record<ReviewState, string> = {
  APPROVED: "stateApproved",
  CHANGES_REQUESTED: "stateChangesRequested",
  COMMENTED: "stateCommented",
  PENDING: "statePending",
};

const LANE_HEIGHT = 42;
const BAR_HEIGHT = 34;

export function IssueBar({
  issue,
  span,
  lane,
  isSelected,
  onSelect,
}: {
  issue: NormalizedIssue;
  span: IssueSpan;
  lane: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const left = span.startDay * DAY_WIDTH_PX;
  const width = span.widthDays * DAY_WIDTH_PX - 4;
  const top = lane * LANE_HEIGHT + 4;
  // Too narrow for even the identifier to read -- fall back to a color chip.
  const isCompact = width < 60;

  const classNames = [
    styles.issueBar,
    styles[issue.statusFamily],
    span.isClippedLeft ? styles.clippedLeft : "",
    span.isClippedRight ? styles.clippedRight : "",
    span.isOpenEnded ? styles.openEnded : "",
    isSelected ? styles.selected : "",
    isCompact ? styles.compact : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classNames}
      style={{ left, width, top, height: BAR_HEIGHT }}
      onClick={onSelect}
      title={`${issue.identifier}: ${issue.title}`}
    >
      {isCompact ? (
        <>
          <span className={styles.issueBarId}>{issue.identifier.replace("ORB-", "")}</span>
          {issue.reviewAggregate && (
            <span
              className={`${styles.compactDot} ${styles[REVIEW_STATE_CLASS[issue.reviewAggregate]]}`}
              aria-hidden
            />
          )}
        </>
      ) : (
        <span className={styles.issueBarLabel}>
          <span className={styles.issueBarId}>{issue.identifier}</span> {issue.title}
        </span>
      )}
      {!isCompact && issue.prs.length > 0 && (
        <span className={styles.prDots}>
          {issue.prs.map((pr, i) => (
            <span key={`${pr.repoOwner}/${pr.repoName}#${pr.number}`} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && pr.stackParent && <span className={styles.prDotConnector} />}
              <span
                className={`${styles.prDot} ${
                  pr.aggregateState ? styles[REVIEW_STATE_CLASS[pr.aggregateState]] : ""
                }`}
                style={pr.aggregateState ? undefined : { background: "currentColor", opacity: 0.35 }}
              />
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
