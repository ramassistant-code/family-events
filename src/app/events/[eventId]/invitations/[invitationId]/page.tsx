import { InvitationForm } from "@/components/InvitationForm";
import { requireEventAccess } from "@/lib/access";
import { canEditInvitations, canSoftDeleteInvitation } from "@/lib/permissions";
import { getInvitation } from "@/lib/queries";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InvitationDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; invitationId: string }>;
}) {
  const { eventId, invitationId } = await params;
  const { user, role } = await requireEventAccess(eventId);
  const invitation = await getInvitation(eventId, invitationId);
  if (!invitation || invitation.deleted_at) notFound();
  const readOnly = !canEditInvitations(role);

  return (
    <div className="grid gap-4">
      <h2 className="page-title">{invitation.household_name}</h2>
      <InvitationForm
        eventId={eventId}
        invitation={invitation}
        readOnly={readOnly}
        canDelete={canSoftDeleteInvitation(role, user.id, invitation.created_by)}
      />
    </div>
  );
}
