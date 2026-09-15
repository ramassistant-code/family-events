import { RestoreButton } from "@/components/RestoreButton";
import { requireAdmin } from "@/lib/access";
import { formatDateTimeJerusalem } from "@/lib/dates";
import { getEvent, listTrash } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const eventId = typeof query.eventId === "string" ? query.eventId : undefined;
  const rows = await listTrash(eventId);
  const items = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      eventName: (await getEvent(row.event_id))?.name ?? "",
    })),
  );

  return (
    <div className="grid gap-4">
      <h2 className="page-title">מחוקים / שחזור</h2>
      <p className="text-[var(--ink-soft)]">אין מחיקה פיזית בממשק. שחזור זמין למנהל מערכת בלבד.</p>
      {items.length === 0 ? (
        <div className="card p-8 text-center">אין פריטים מחוקים</div>
      ) : (
        <div className="grid gap-3">
          {items.map((row) => (
            <article key={row.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h3 className="font-display text-lg">{row.household_name}</h3>
                <p className="text-sm text-[var(--ink-soft)]">
                  {row.eventName} · נמחק {formatDateTimeJerusalem(row.deleted_at)} · {row.deleted_by_name || "לא ידוע"}
                </p>
              </div>
              <RestoreButton invitationId={row.id} eventId={row.event_id} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
