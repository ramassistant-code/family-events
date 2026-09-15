import { UserForm } from "@/components/UserForm";
import { requireAdmin } from "@/lib/access";
import { getUserById, listEvents, listMembershipsForUser } from "@/lib/queries";
import { notFound } from "next/navigation";

export default async function EditUserPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin();
  const { userId } = await params;
  const user = await getUserById(userId);
  if (!user) notFound();
  const events = await listEvents();
  const memberships = await listMembershipsForUser(userId);
  return (
    <div className="grid gap-4">
      <h2 className="page-title">עריכת משתמש</h2>
      <UserForm
        user={user}
        events={events.map((event) => ({ id: event.id, name: event.name }))}
        memberships={memberships.map((item) => ({ event_id: item.event_id, role: item.role }))}
      />
    </div>
  );
}
