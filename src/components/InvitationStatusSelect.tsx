"use client";

import { updateInvitationStatusAction } from "@/actions/invitations";
import { InvitationStatusChip } from "@/components/Chips";
import {
  INVITATION_STATUS_LABELS,
  isInvitationStatus,
  type InvitationStatus,
} from "@/lib/domain";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function InvitationStatusSelect({
  eventId,
  invitationId,
  status,
  canEdit,
}: {
  eventId: string;
  invitationId: string;
  status: InvitationStatus;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(status);
  }, [status]);

  if (!canEdit) {
    return <InvitationStatusChip status={status} />;
  }

  return (
    <div className="grid gap-1">
      <select
        className="select status-select"
        value={value}
        disabled={pending}
        aria-label="סטטוס"
        onChange={(event) => {
          const next = event.target.value;
          if (!isInvitationStatus(next) || next === value) return;
          const previous = value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await updateInvitationStatusAction(eventId, invitationId, next);
            if (!result.ok) {
              setValue(previous);
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {Object.entries(INVITATION_STATUS_LABELS).map(([option, label]) => (
          <option key={option} value={option}>
            {label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-[var(--no)]">{error}</p> : null}
    </div>
  );
}
