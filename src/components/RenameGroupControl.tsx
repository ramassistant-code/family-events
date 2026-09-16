"use client";

import { renameInvitationGroupAction } from "@/actions/invitations";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RenameGroupControl({
  eventId,
  groupNames,
  isFamilyMember,
}: {
  eventId: string;
  groupNames: string[];
  isFamilyMember: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oldGroupName, setOldGroupName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  const canSubmit = Boolean(oldGroupName.trim() && newGroupName.trim()) && !pending;
  const scopeBody = isFamilyMember
    ? "שינוי השם יחול על כל ההזמנות הפעילות באירוע שנוצרו על ידכם ומשויכות לקבוצה שנבחרה, ללא תלות בסינון הרשימה."
    : "שינוי השם יחול על כל ההזמנות הפעילות באירוע המשויכות לקבוצה שנבחרה, ללא תלות בסינון הרשימה.";

  function openDialog() {
    setDialogOpen(true);
    setPending(false);
    setError(null);
    setOldGroupName("");
    setNewGroupName("");
  }

  async function confirmRename() {
    setPending(true);
    setError(null);
    const result = await renameInvitationGroupAction(eventId, oldGroupName, newGroupName);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-secondary" type="button" onClick={openDialog}>
        שינוי שם קבוצה
      </button>
      {dialogOpen ? (
        <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center p-4">
          <div className="card max-w-md p-5">
            <h3 className="text-lg font-bold">שינוי שם קבוצה</h3>
            <p className="mt-2 text-[var(--ink-soft)]">{scopeBody}</p>
            <label className="field mt-3">
              <span>קבוצה קיימת</span>
              <select
                className="select"
                value={oldGroupName}
                onChange={(event) => setOldGroupName(event.target.value)}
              >
                <option value="">בחרו קבוצה</option>
                {groupNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field mt-3">
              <span>שם חדש</span>
              <input
                className="input"
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="למשל: אבא כלה – שכנים"
                autoComplete="off"
              />
            </label>
            {error ? <p className="mt-2 text-[var(--no)]">{error}</p> : null}
            <div className="mt-4 flex gap-2">
              <button className="btn btn-primary" disabled={!canSubmit} type="button" onClick={() => void confirmRename()}>
                {pending ? "מעדכן…" : "שינוי שם"}
              </button>
              <button className="btn btn-secondary" disabled={pending} type="button" onClick={() => setDialogOpen(false)}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
