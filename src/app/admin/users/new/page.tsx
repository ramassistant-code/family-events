import { UserForm } from "@/components/UserForm";
import { requireAdmin } from "@/lib/access";
import { listEvents } from "@/lib/queries";

export default async function NewUserPage() {
  await requireAdmin();
  const events = await listEvents();
  return (
    <div className="grid gap-4">
      <h2 className="page-title">משתמש חדש</h2>
      <UserForm events={events.map((event) => ({ id: event.id, name: event.name }))} memberships={[]} />
    </div>
  );
}
