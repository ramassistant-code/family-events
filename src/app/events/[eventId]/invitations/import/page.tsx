import { ImportClient } from "@/components/ImportClient";
import { requireEventAccess } from "@/lib/access";
import { canImportInvitations } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ImportPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { role } = await requireEventAccess(eventId);
  if (!canImportInvitations(role)) {
    redirect(`/events/${eventId}/invitations`);
  }
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-bold">ייבוא הזמנות</h2>
      <ImportClient eventId={eventId} />
    </div>
  );
}
