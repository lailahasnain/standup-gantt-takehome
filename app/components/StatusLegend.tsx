import { STATUS_FAMILY_LABEL, STATUS_FAMILY_ORDER } from "@/lib/gantt/types";
import styles from "../gantt.module.css";

const SWATCH_COLOR: Record<string, string> = {
  planned: "#c3c9bd",
  active: "#5fb989",
  review: "#e2ab3f",
  deployed: "#6ea2c4",
  done: "#a8b3a2",
  cancelled: "#c07a6d",
};

export function StatusLegend() {
  return (
    <div className={styles.legend}>
      {STATUS_FAMILY_ORDER.map((family) => (
        <span key={family} className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: SWATCH_COLOR[family] }} />
          {STATUS_FAMILY_LABEL[family]}
        </span>
      ))}
    </div>
  );
}
