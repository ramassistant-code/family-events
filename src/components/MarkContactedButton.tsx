"use client";

import { markContactedAction } from "@/actions/invitations";
import { useFormStatus } from "react-dom";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-secondary" disabled={pending} type="submit">
      {pending ? "מעדכן…" : "סימון: פנינו"}
    </button>
  );
}

export function MarkContactedButton({ eventId, invitationId }: { eventId: string; invitationId: string }) {
  return (
    <form
      action={async () => {
        await markContactedAction(eventId, invitationId);
      }}
    >
      <Submit />
    </form>
  );
}
