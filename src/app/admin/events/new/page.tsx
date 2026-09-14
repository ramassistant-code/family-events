import { EventForm } from "@/components/EventForm";
import { requireAdmin } from "@/lib/access";

export default async function NewEventPage() {
  await requireAdmin();
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-bold">אירוע חדש</h2>
      <EventForm />
    </div>
  );
}
