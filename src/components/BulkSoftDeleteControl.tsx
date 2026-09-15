"use client";

import { bulkSoftDeleteListedInvitationsAction } from "@/actions/invitations";
import type { ListedInvitationFilterInput } from "@/lib/invitation-filters";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BulkSoftDeleteControl({
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

  const confirmBody =
    isFamilyMember && eligibleCount < listedCount
      ? `יימחקו ${eligibleCount} הזמנות שנוצרו על ידכם מתוך ${listedCount} המוצגות. ההזמנות יועברו למחוקים וניתן לשחזר אותן על ידי מנהל מערכת.`
      : `יימחקו ${eligibleCount} הזמנות מוצגות. ההזמנות יועברו למחוקים וניתן לשחזר אותן על ידי מנהל מערכת.`;

  async function confirmDelete() {
    setPending(true);
    setError(null);
    const result = await bulkSoftDeleteListedInvitationsAction(eventId, filters);
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
      <button className="btn btn-danger" type="button" onClick={() => setDialogOpen(true)}>
        מחק את המוצגות
      </button>
      {dialogOpen ? (
        <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center p-4">
          <div className="card max-w-md p-5">
            <h3 className="text-lg font-bold">העברה למחוקים</h3>
            <p className="mt-2 text-[var(--ink-soft)]">{confirmBody}</p>
            {error ? <p className="mt-2 text-[var(--no)]">{error}</p> : null}
            <div className="mt-4 flex gap-2">
              <button className="btn btn-danger" disabled={pending} type="button" onClick={() => void confirmDelete()}>
                {pending ? "מוחק…" : "מחיקה"}
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
