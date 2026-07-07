"use client";

import { useState } from "react";
import { TEAM } from "@/lib/fake-source/seed";
import type { IssueCreateInput } from "@/lib/gantt/client";
import { Modal } from "./Modal";
import styles from "../panels.module.css";

export function NewIssueDialog({
  onCreate,
  onClose,
}: {
  onCreate: (input: IssueCreateInput) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        title: title.trim(),
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <form
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-issue-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelTitle} id="new-issue-title">
              New issue
            </p>
            <p className={styles.panelSubtitle}>Created in fake-Linear, lands in Selected For Development.</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.panelBody}>
          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="new-title">
              Title
            </label>
            <input
              id="new-title"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="e.g. Fix tile cache eviction race"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-assignee">
                Assignee
              </label>
              <select
                id="new-assignee"
                className={styles.select}
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {Object.values(TEAM).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-due">
                Due date
              </label>
              <input
                id="new-due"
                type="date"
                className={styles.input}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.panelFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? "Creating…" : "Create issue"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
