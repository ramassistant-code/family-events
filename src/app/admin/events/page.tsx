import { EventStatusChip, EventTypeLabel } from "@/components/Chips";
import { EventCoverImage } from "@/components/EventCoverImage";
import { requireAdmin } from "@/lib/access";
import { formatDateTimeJerusalem } from "@/lib/dates";
import { listEvents } from "@/lib/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  await requireAdmin();
  const events = await listEvents();
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">אירועים</h2>
        <Link className="btn btn-primary" href="/admin/events/new">
          אירוע חדש
        </Link>
      </div>
      <div className="grid gap-3">
        {events.map((event) => (
          <Link key={event.id} href={`/admin/events/${event.id}`} className="card flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              {event.cover_image_url ? (
                <EventCoverImage src={event.cover_image_url} alt={`תמונת כיסוי של ${event.name}`} variant="thumb" />
              ) : null}
              <div>
                <h3 className="text-lg font-bold">{event.name}</h3>
                <p className="text-sm text-[var(--ink-soft)]">
                  <EventTypeLabel type={event.event_type} /> · קיבולת {event.capacity} · {formatDateTimeJerusalem(event.starts_at)}
                </p>
              </div>
            </div>
            <EventStatusChip status={event.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
