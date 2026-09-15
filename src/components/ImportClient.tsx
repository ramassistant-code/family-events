"use client";

import { previewImportAction, confirmImportAction } from "@/actions/invitations";
import type { ImportRow } from "@/lib/import";
import { INVITATION_STATUS_LABELS, INVITING_SIDE_LABELS } from "@/lib/domain";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; valid: number; warnings: number; errors: number } | null>(
    null,
  );
  const [fileWarnings, setFileWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<number | null>(null);

  return (
    <div className="grid gap-4">
      <form
        className="card grid gap-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          setCreated(null);
          setFileWarnings([]);
          const formData = new FormData(event.currentTarget);
          const result = await previewImportAction(eventId, formData);
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setRows(result.rows);
          setSummary(result.summary);
          setFileWarnings(result.fileWarnings);
        }}
      >
        <label className="field">
          <span>קובץ Excel או CSV</span>
          <input className="input" type="file" name="file" accept=".csv,.xlsx,.xls,.txt" required />
        </label>
        <p className="text-sm text-[var(--ink-soft)]">
          ייבוא יוצר רשומות חדשות בלבד, עד 2,000 שורות. סטטוס ברירת מחדל: טרם פנינו. כפילות טלפון תופיע כאזהרה ולא תעדכן רשומה קיימת.
        </p>
        <button className="btn btn-secondary w-fit" disabled={pending} type="submit">
          {pending ? "קורא…" : "תצוגה מקדימה"}
        </button>
      </form>

      {error ? <p className="text-[var(--no)]">{error}</p> : null}
      {fileWarnings.length ? (
        <div className="card p-4 text-sm text-[var(--wait)]" role="status">
          {fileWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      {summary ? (
        <div className="card p-4 text-sm">
          {summary.total} שורות · {summary.valid} תקינות · {summary.warnings} אזהרות · {summary.errors} שגיאות
        </div>
      ) : null}

      {rows ? (
        <>
          <div className="table-wrap card">
            <table className="data">
              <thead>
                <tr>
                  <th>שורה</th>
                  <th>שם</th>
                  <th>טלפון</th>
                  <th>צד</th>
                  <th>מבוגרים</th>
                  <th>ילדים</th>
                  <th>קבוצה</th>
                  <th>הערות</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.line}>
                    <td>{row.line}</td>
                    <td>{row.householdName}</td>
                    <td>{row.phone}</td>
                    <td>{INVITING_SIDE_LABELS[row.invitingSide]}</td>
                    <td>{row.adults}</td>
                    <td>{row.children}</td>
                    <td>{row.groupName || "—"}</td>
                    <td>
                      {row.errors.join(" · ")}
                      {row.warnings.join(" · ")}
                      {!row.errors.length && !row.warnings.length ? INVITATION_STATUS_LABELS.not_contacted : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="btn btn-primary w-fit"
            disabled={pending || rows.every((row) => row.errors.length > 0)}
            type="button"
            onClick={async () => {
              setPending(true);
              const result = await confirmImportAction(eventId, rows);
              setPending(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setCreated(result.created);
              router.refresh();
            }}
          >
            אישור ייבוא
          </button>
        </>
      ) : null}

      {created != null ? <p className="text-[var(--ok)]">נוצרו {created} הזמנות חדשות.</p> : null}
    </div>
  );
}
