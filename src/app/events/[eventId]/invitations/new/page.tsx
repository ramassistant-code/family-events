import { InvitationForm } from "@/components/InvitationForm";
import { requireEventAccess } from "@/lib/access";
import { canEditInvitations } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewInvitationPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { role } = await requireEventAccess(eventId);
  if (!canEditInvitations(role)) {
    redirect(`/events/${eventId}/invitations`);
  }
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-bold">הזמנה חדשה</h2>
      <InvitationForm eventId={eventId} />
    </div>
  );
}
