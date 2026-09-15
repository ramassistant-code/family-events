import { InvitationStatusChip, SideChip } from "@/components/Chips";
import { EventCoverImage } from "@/components/EventCoverImage";
import { requireEventAccess } from "@/lib/access";
import { summarizeCapacity } from "@/lib/capacity";
import { remainingUntil } from "@/lib/dates";
import { EVENT_TYPE_LABELS, INVITATION_STATUS_LABELS, INVITING_SIDE_LABELS } from "@/lib/domain";
import { listFollowUps, listInvitations } from "@/lib/queries";
import { canEditInvitations } from "@/lib/permissions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { role, event } = await requireEventAccess(eventId);
  const invitations = await listInvitations(eventId);
  const stats = summarizeCapacity(
    invitations.map((row) => ({
      status: row.status,
      invitingSide: row.inviting_side,
      adults: row.adults,
      children: row.children,
    })),
    event.capacity,
  );
  const today = await listFollowUps(eventId, "today");
  const overdue = await listFollowUps(eventId, "overdue");
  const canEdit = canEditInvitations(role);
  const occupancy = Math.min(100, Math.round(stats.progress * 100));
  const remaining = remainingUntil(event.starts_at);
  const confirmedInvites = stats.byStatus.confirmed.invites;
  const confirmedShare = stats.activeInvites ? Math.round((confirmedInvites / stats.activeInvites) * 100) : 0;
  const freeSeats = Math.max(0, event.capacity - stats.confirmedGuests);

  return (
    <div className="grid gap-4">
      {event.cover_image_url ? (
        <EventCoverImage src={event.cover_image_url} alt={`תמונת כיסוי של ${event.name}`} variant="hero" />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps">{EVENT_TYPE_LABELS[event.event_type]}</p>
          <h2 className="page-title mt-1">דשבורד</h2>
          <p className="mt-1 text-[var(--ink-soft)]">
            {[event.location, event.owners_text].filter(Boolean).join(" · ")}
          </p>
        </div>
        {canEdit ? (
          <Link className="btn btn-primary" href={`/events/${eventId}/invitations/new`}>
            הזמנה חדשה
          </Link>
        ) : null}
      </div>

      {remaining && !remaining.past ? (
        <section className="card p-4">
          <p className="label-caps">עוד {remaining.days} ימים לאירוע</p>
          <div className="countdown-grid mt-3">
            <div className="countdown-cell">
              <strong>{remaining.days}</strong>
              <span>ימים</span>
            </div>
            <div className="countdown-cell">
              <strong>{remaining.hours}</strong>
              <span>שעות</span>
            </div>
            <div className="countdown-cell">
              <strong>{remaining.minutes}</strong>
              <span>דקות</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2">
        <div className="card p-4">
          <p className="label-caps">תפוסת האולם</p>
          <p className="stat-num mt-2">{occupancy}%</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            {stats.confirmedGuests} מאושרים מתוך {event.capacity}
            {stats.overflow ? "" : ` · ${freeSeats} מקומות פנויים`}
          </p>
          <div className={`progress mt-3 ${stats.overflow ? "overflow" : ""}`}>
            <span style={{ width: `${occupancy}%` }} />
          </div>
          {stats.overflow ? <p className="mt-2 text-sm text-[var(--no)]">חריגה מהקיבולת</p> : null}
        </div>
        <div className="card p-4">
          <p className="label-caps">אישורי הגעה</p>
          <p className="stat-num mt-2">{confirmedInvites}</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            {confirmedShare}% מההזמנות אישרו · {stats.totalGuests} מוזמנים בסך הכל
          </p>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">
            {stats.byStatus.confirmed.invites} אישרו · {stats.byStatus.declined.invites} סירבו ·{" "}
            {stats.byStatus.considering.invites} מתלבטים · {stats.byStatus.awaiting.invites} ממתינים
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(Object.keys(INVITATION_STATUS_LABELS) as Array<keyof typeof INVITATION_STATUS_LABELS>).map((status) => (
          <Link key={status} href={`/events/${eventId}/invitations?status=${status}`} className="card card-interactive p-4">
            <p className="text-sm text-[var(--ink-soft)]">{INVITATION_STATUS_LABELS[status]}</p>
            <p className="mt-1 font-display text-2xl text-[var(--gold-radiant)]">{stats.byStatus[status].invites}</p>
          </Link>
        ))}
      </section>

      <section className="card p-4">
        <h3 className="mb-3 text-lg">חלוקה לפי צד מזמין</h3>
        <div className="grid gap-3 md:grid-cols-4">
          {(Object.keys(INVITING_SIDE_LABELS) as Array<keyof typeof INVITING_SIDE_LABELS>).map((side) => (
            <Link
              key={side}
              href={`/events/${eventId}/invitations?side=${side}`}
              className="rounded-lg border border-[var(--line)] bg-[var(--paper-deep)] p-3"
            >
              <p className="font-semibold text-[var(--gold-radiant)]">{INVITING_SIDE_LABELS[side]}</p>
              <p className="text-sm text-[var(--ink-soft)]">
                {stats.bySide[side].invites} הזמנות · {stats.bySide[side].guests} מוזמנים · {stats.bySide[side].confirmedGuests}{" "}
                מאושרים
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <FollowList title="מעקבים להיום" eventId={eventId} bucket="today" rows={today} />
        <FollowList title="מעקבים באיחור" eventId={eventId} bucket="overdue" rows={overdue} />
      </section>
    </div>
  );
}

function FollowList({
  title,
  eventId,
  bucket,
  rows,
}: {
  title: string;
  eventId: string;
  bucket: "today" | "overdue";
  rows: { id: string; household_name: string; status: import("@/lib/domain").InvitationStatus; inviting_side: import("@/lib/domain").InvitingSide }[];
}) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg">{title}</h3>
        <Link className="text-sm text-[var(--wine)]" href={`/events/${eventId}/invitations?followUp=${bucket}`}>
          לכל הרשימה
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-[var(--ink-soft)]">אין פריטים</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--paper-deep)] px-3 py-2"
            >
              <Link href={`/events/${eventId}/invitations/${row.id}`}>{row.household_name}</Link>
              <span className="flex gap-1">
                <InvitationStatusChip status={row.status} />
                <SideChip side={row.inviting_side} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
