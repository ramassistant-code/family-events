import { EventForm } from "@/components/EventForm";
import { requireAdmin } from "@/lib/access";
import { getEvent } from "@/lib/queries";
import { notFound } from "next/navigation";

export default async function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  await requireAdmin();
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();
  return (
    <div className="grid gap-4">
      <h2 className="page-title">עריכת אירוע</h2>
      <EventForm event={event} />
    </div>
  );
}
