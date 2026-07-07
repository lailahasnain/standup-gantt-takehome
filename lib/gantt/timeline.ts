import type { NormalizedIssue } from "./types";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const RANGE_START_OFFSET_DAYS = -7;
export const RANGE_END_OFFSET_DAYS = 21;
export const DAY_WIDTH_PX = 36;

export function rangeStart(now: Date): Date {
  return startOfDay(new Date(now.getTime() + RANGE_START_OFFSET_DAYS * DAY_MS));
}

export function rangeEnd(now: Date): Date {
  return startOfDay(new Date(now.getTime() + RANGE_END_OFFSET_DAYS * DAY_MS));
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dayIndex(date: Date, start: Date): number {
  return Math.round((startOfDay(date).getTime() - start.getTime()) / DAY_MS);
}

export interface IssueSpan {
  /** True if the issue has neither a start nor an end -- omit it from the grid. */
  hasNoSpan: boolean;
  /** True if the effective start is left of the visible range (long-running work). */
  isClippedLeft: boolean;
  /** True if the due date falls beyond the visible range (far-future planned work). */
  isClippedRight: boolean;
  /** True if there's a start but no due date -- the bar runs open-ended to today. */
  isOpenEnded: boolean;
  /** Left offset and width in day units, already clamped to the visible range. */
  startDay: number;
  widthDays: number;
}

const TOTAL_DAYS = RANGE_END_OFFSET_DAYS - RANGE_START_OFFSET_DAYS;

// plannedStart only fills in when Linear has no startedAt yet -- never overrides one.
export function computeSpan(issue: NormalizedIssue, plannedStart: string | null, now: Date): IssueSpan | null {
  const start = issue.startedAt ?? plannedStart ?? null;
  const due = issue.dueDate;

  if (!start && !due) {
    return {
      hasNoSpan: true,
      isClippedLeft: false,
      isClippedRight: false,
      isOpenEnded: false,
      startDay: 0,
      widthDays: 0,
    };
  }

  const rStart = rangeStart(now);
  const effectiveStartDate = start ? new Date(start) : new Date(due!);
  const effectiveEndDate = due ? new Date(due) : now;

  const rawStartDay = dayIndex(effectiveStartDate, rStart);
  const rawEndDay = Math.max(dayIndex(effectiveEndDate, rStart), rawStartDay) + 1; // inclusive of due day

  const startDay = Math.min(Math.max(rawStartDay, 0), TOTAL_DAYS - 1);
  const endDay = Math.max(Math.min(rawEndDay, TOTAL_DAYS), startDay + 1);
  const widthDays = endDay - startDay;

  return {
    hasNoSpan: false,
    isClippedLeft: rawStartDay < 0,
    isClippedRight: rawEndDay > TOTAL_DAYS,
    isOpenEnded: !due,
    startDay,
    widthDays,
  };
}

export interface LanePlacement {
  issue: NormalizedIssue;
  span: IssueSpan;
  lane: number;
}

// Greedy interval packing: each issue goes in the first sub-lane that's free by then.
export function packLanes(
  issues: NormalizedIssue[],
  plannedStarts: Record<string, string | null>,
  now: Date
): { placements: LanePlacement[]; unscheduled: NormalizedIssue[]; laneCount: number } {
  const withSpans = issues
    .map((issue) => ({ issue, span: computeSpan(issue, plannedStarts[issue.id] ?? null, now) }))
    .filter((x): x is { issue: NormalizedIssue; span: IssueSpan } => x.span != null);

  const unscheduled = withSpans.filter((x) => x.span.hasNoSpan).map((x) => x.issue);
  const scheduled = withSpans
    .filter((x) => !x.span.hasNoSpan)
    .sort((a, b) => a.span.startDay - b.span.startDay);

  const laneEnds: number[] = []; // end day currently occupied in each lane
  const placements: LanePlacement[] = [];

  for (const { issue, span } of scheduled) {
    const end = span.startDay + span.widthDays;
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= span.startDay);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    placements.push({ issue, span, lane });
  }

  return { placements, unscheduled, laneCount: Math.max(laneEnds.length, 1) };
}
