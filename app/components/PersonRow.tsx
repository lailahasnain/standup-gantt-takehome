import { DAY_WIDTH_PX, RANGE_END_OFFSET_DAYS, RANGE_START_OFFSET_DAYS, packLanes } from "@/lib/gantt/timeline";
import type { PersonGroup, ReviewState } from "@/lib/gantt/types";
import { IssueBar } from "./IssueBar";
import styles from "../gantt.module.css";

const LANE_HEIGHT = 42;
const TOTAL_DAYS = RANGE_END_OFFSET_DAYS - RANGE_START_OFFSET_DAYS;

const REVIEW_STATE_CLASS: Record<ReviewState, string> = {
  APPROVED: "stateApproved",
  CHANGES_REQUESTED: "stateChangesRequested",
  COMMENTED: "stateCommented",
  PENDING: "statePending",
};

export function PersonRow({
  person,
  plannedStarts,
  now,
  selectedIssueId,
  onSelectIssue,
}: {
  person: PersonGroup;
  plannedStarts: Record<string, string | null>;
  now: Date;
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string) => void;
}) {
  const { placements, unscheduled, laneCount } = packLanes(person.issues, plannedStarts, now);

  return (
    <div className={styles.row + " " + styles.personRow}>
      <div className={styles.labelCol}>
        <div className={styles.personLabel}>
          <span className={styles.personName}>{person.name}</span>
          <span className={styles.personMeta}>
            {person.issues.length} issue{person.issues.length === 1 ? "" : "s"}
          </span>
          {unscheduled.length > 0 && (
            <div className={styles.unscheduledList}>
              {unscheduled.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  className={styles.unscheduledBadge}
                  title={`${issue.identifier}: ${issue.title} -- no start or due date yet`}
                  onClick={() => onSelectIssue(issue.id)}
                >
                  {issue.identifier}
                </button>
              ))}
            </div>
          )}
          {person.orphanPrs.length > 0 && (
            <div className={styles.unscheduledList}>
              {person.orphanPrs.map((pr) => (
                <a
                  key={`${pr.repoOwner}/${pr.repoName}#${pr.number}`}
                  href={pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`${styles.orphanPrBadge} ${
                    pr.aggregateState ? styles[REVIEW_STATE_CLASS[pr.aggregateState]] : ""
                  }`}
                  title={`${pr.repoName}#${pr.number}: ${pr.title} -- no linked Linear issue`}
                >
                  {pr.repoName}#{pr.number}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div
        className={styles.laneArea}
        style={{
          width: TOTAL_DAYS * DAY_WIDTH_PX,
          height: laneCount * LANE_HEIGHT + 8,
          ["--day-width" as string]: `${DAY_WIDTH_PX}px`,
        }}
      >
        {placements.map(({ issue, span, lane }) => (
          <IssueBar
            key={issue.id}
            issue={issue}
            span={span}
            lane={lane}
            isSelected={selectedIssueId === issue.id}
            onSelect={() => onSelectIssue(issue.id)}
          />
        ))}
      </div>
    </div>
  );
}
