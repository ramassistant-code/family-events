"use client";

import { restoreInvitationAction } from "@/actions/invitations";

export function RestoreButton({ invitationId, eventId }: { invitationId: string; eventId: string }) {
  return (
    <form
      action={async () => {
        await restoreInvitationAction(invitationId, eventId);
      }}
    >
      <button className="btn btn-primary" type="submit">
        שחזור
      </button>
    </form>
  );
}
