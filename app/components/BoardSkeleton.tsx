import styles from "../gantt.module.css";

const ROWS = [
  [{ left: 8, width: 22 }, { left: 40, width: 14 }],
  [{ left: 2, width: 34 }],
  [{ left: 18, width: 18 }, { left: 44, width: 10 }, { left: 58, width: 16 }],
  [{ left: 12, width: 26 }],
];

export function BoardSkeleton() {
  return (
    <div className={styles.boardCard} aria-hidden="true">
      <div className={styles.skeletonHeader} />
      {ROWS.map((bars, rowIndex) => (
        <div className={styles.skeletonRow} key={rowIndex}>
          <div className={styles.skeletonLabel} />
          <div className={styles.skeletonLane}>
            {bars.map((bar, barIndex) => (
              <div
                key={barIndex}
                className={styles.skeletonBar}
                style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
