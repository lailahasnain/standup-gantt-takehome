import {
  DAY_WIDTH_PX,
  RANGE_END_OFFSET_DAYS,
  RANGE_START_OFFSET_DAYS,
  dayIndex,
  rangeStart,
  startOfDay,
} from "@/lib/gantt/timeline";
import type { PersonGroup } from "@/lib/gantt/types";
import { PersonRow } from "./PersonRow";
import styles from "../gantt.module.css";

const LABEL_COL_WIDTH = 168;
const TOTAL_DAYS = RANGE_END_OFFSET_DAYS - RANGE_START_OFFSET_DAYS;

export function GanttBoard({
  people,
  plannedStarts,
  now,
  selectedIssueId,
  onSelectIssue,
}: {
  people: PersonGroup[];
  plannedStarts: Record<string, string | null>;
  now: Date;
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string) => void;
}) {
  const start = rangeStart(now);
  const today = startOfDay(now);
  const todayLeft = LABEL_COL_WIDTH + dayIndex(today, start) * DAY_WIDTH_PX + DAY_WIDTH_PX / 2;

  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => new Date(start.getTime() + i * 86400000));

  return (
    <div className={styles.boardCard}>
      <div className={styles.boardScroll}>
        <div className={styles.boardInner}>
          <div className={styles.row + " " + styles.axisRow}>
            <div className={styles.labelCol} style={{ width: LABEL_COL_WIDTH, flexBasis: LABEL_COL_WIDTH }}>
              Team
            </div>
            {days.map((d) => {
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const isToday = d.getTime() === today.getTime();
              return (
                <div
                  key={d.toISOString()}
                  className={[styles.dayCell, isWeekend ? styles.weekend : "", isToday ? styles.today : ""]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ ["--day-width" as string]: `${DAY_WIDTH_PX}px` }}
                >
                  <span className={styles.dayCellWeekday}>{d.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                  {d.getDate()}
                </div>
              );
            })}
          </div>

          {people.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              plannedStarts={plannedStarts}
              now={now}
              selectedIssueId={selectedIssueId}
              onSelectIssue={onSelectIssue}
            />
          ))}

          <div className={styles.todayLine} style={{ left: todayLeft }} title="Today" />
        </div>
      </div>
    </div>
  );
}
