import { AppShell } from "@/components/AppShell";
import { EventStatusChip, EventTypeLabel, RoleChip } from "@/components/Chips";
import { EventCoverImage } from "@/components/EventCoverImage";
import { requireSession } from "@/lib/access";
import { accessibleEvents } from "@/lib/queries";
import { formatDateTimeJerusalem } from "@/lib/dates";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EventsPickerPage() {
  const user = await requireSession();
  const events = await accessibleEvents(user.id, user.isSystemAdmin);
  if (events.length === 1) {
    redirect(`/events/${events[0].id}/dashboard`);
  }

  return (
    <AppShell
      title="בחירת אירוע"
      role={user.isSystemAdmin ? "system_admin" : null}
      userName={user.name}
      items={[{ href: "/events", label: "אירועים" }]}
      moreItems={user.isSystemAdmin ? [{ href: "/admin/events", label: "ניהול" }] : []}
    >
      {events.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold">אין אירועים מוקצים</h2>
          <p className="mt-2 text-[var(--ink-soft)]">פנו למנהל המערכת כדי לקבל גישה לאירוע.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}/dashboard`}
              className="card block overflow-hidden hover:border-[var(--gold)]"
            >
              {event.cover_image_url ? (
                <EventCoverImage src={event.cover_image_url} alt={`תמונת כיסוי של ${event.name}`} variant="banner" />
              ) : null}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold">{event.name}</h2>
                  <EventStatusChip status={event.status} />
                </div>
                <p className="mt-2 text-[var(--ink-soft)]">
                  <EventTypeLabel type={event.event_type} /> · {formatDateTimeJerusalem(event.starts_at)}
                </p>
                <div className="mt-3">
                  <RoleChip role={event.role} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
