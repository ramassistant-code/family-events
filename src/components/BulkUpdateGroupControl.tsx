"use client";

import { bulkUpdateListedInvitationGroupsAction } from "@/actions/invitations";
import { normalizeInvitationGroupName, type ListedInvitationFilterInput } from "@/lib/invitation-filters";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BulkUpdateGroupControl({
  eventId,
  filters,
  listedCount,
  eligibleCount,
  isFamilyMember,
}: {
  eventId: string;
  filters: ListedInvitationFilterInput;
  listedCount: number;
  eligibleCount: number;
  isFamilyMember: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");

  const nextGroup = normalizeInvitationGroupName(groupName);
  const countBody =
    isFamilyMember && eligibleCount < listedCount
      ? `יעודכנו ${eligibleCount} הזמנות שנוצרו על ידכם מתוך ${listedCount} המוצגות.`
      : `יעודכנו ${eligibleCount} הזמנות מוצגות.`;
  const clearBody = nextGroup
    ? `הקבוצה החדשה תהיה «${nextGroup}».`
    : "השדה ריק — הקבוצה תנוקה מההזמנות (ללא ערך).";

  function openDialog() {
    setDialogOpen(true);
    setPending(false);
    setError(null);
    setGroupName("");
  }

  async function confirmUpdate() {
    setPending(true);
    setError(null);
    const result = await bulkUpdateListedInvitationGroupsAction(eventId, filters, groupName);
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
        עדכון קבוצה
      </button>
      {dialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="card max-w-md p-5">
            <h3 className="text-lg font-bold">עדכון קבוצה</h3>
            <p className="mt-2 text-[var(--ink-soft)]">{countBody}</p>
            <label className="field mt-3">
              <span>קבוצה חדשה</span>
              <input
                className="input"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="למשל: אבא כלה – שכנים"
                autoComplete="off"
              />
            </label>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{clearBody}</p>
            {error ? <p className="mt-2 text-[var(--no)]">{error}</p> : null}
            <div className="mt-4 flex gap-2">
              <button className="btn btn-primary" disabled={pending} type="button" onClick={() => void confirmUpdate()}>
                {pending ? "מעדכן…" : "עדכון"}
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
