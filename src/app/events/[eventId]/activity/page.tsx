import { requireEventAccess } from "@/lib/access";
import { formatDateTimeJerusalem } from "@/lib/dates";
import { canViewFullActivity } from "@/lib/permissions";
import { listActivity } from "@/lib/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { role } = await requireEventAccess(eventId);
  const full = canViewFullActivity(role);
  const rows = await listActivity(eventId, full ? 200 : 12);

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="page-title">פעילות</h2>
        <p className="text-[var(--ink-soft)]">
          {full ? "היסטוריה מלאה לאירוע זה." : "תקציר פעולות אחרונות בלבד."}
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="card p-8 text-center">עדיין אין פעילות</div>
      ) : (
        <ol className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="card p-4">
              <p className="font-semibold">{row.summary}</p>
              <p className="text-sm text-[var(--ink-soft)]">
                {row.actor_name || "מערכת"} · {formatDateTimeJerusalem(row.created_at)}
              </p>
              {row.invitation_id ? (
                <Link className="mt-2 inline-block text-sm text-[var(--wine)]" href={`/events/${eventId}/invitations/${row.invitation_id}`}>
                  פתיחת הזמנה
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
