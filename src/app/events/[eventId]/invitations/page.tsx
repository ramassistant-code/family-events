import { BulkSoftDeleteControl } from "@/components/BulkSoftDeleteControl";
import { EmptyState } from "@/components/Chips";
import { InvitationStatusChip, SideChip } from "@/components/Chips";
import { MarkContactedButton } from "@/components/MarkContactedButton";
import { requireEventAccess } from "@/lib/access";
import { formatDateJerusalem, formatDateTimeJerusalem } from "@/lib/dates";
import { INVITATION_STATUS_LABELS, INVITING_SIDE_LABELS } from "@/lib/domain";
import { parseListedInvitationFilters } from "@/lib/invitation-filters";
import {
  canBulkSoftDelete,
  canEditInvitations,
  canExportInvitations,
  canImportInvitations,
  invitationsEligibleForSoftDelete,
} from "@/lib/permissions";
import { listInvitationGroupNames, listInvitations } from "@/lib/queries";
import { telHref, whatsappHref } from "@/lib/phone";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InvitationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { user, role } = await requireEventAccess(eventId);
  const filters = parseListedInvitationFilters({
    q: String(query.q ?? ""),
    status: String(query.status ?? ""),
    side: String(query.side ?? ""),
    followUp: String(query.followUp ?? ""),
    group: String(query.group ?? ""),
  });
  const q = filters.query ?? "";
  const status = filters.status ?? "";
  const side = filters.side ?? "";
  const followUp = filters.followUp ?? "";
  const group = filters.group ?? "";
  const sort = String(query.sort ?? "name") as "name" | "status" | "follow_up" | "last_contacted" | "created";

  const [rows, groupNames] = await Promise.all([
    listInvitations(eventId, { ...filters, sort }),
    listInvitationGroupNames(eventId),
  ]);
  const canEdit = canEditInvitations(role);
  const canImport = canImportInvitations(role);
  const canExport = canExportInvitations(role);
  const canBulkDelete = canBulkSoftDelete(role);
  const eligibleCount = invitationsEligibleForSoftDelete(role, user.id, rows).length;
  const exportHref = `/api/events/${eventId}/export?${new URLSearchParams({
    q,
    status,
    side,
    followUp,
    group,
  }).toString()}`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">הזמנות</h2>
        <div className="flex flex-wrap gap-2">
          {canImport ? (
            <Link className="btn btn-secondary" href={`/events/${eventId}/invitations/import`}>
              ייבוא
            </Link>
          ) : null}
          {canExport ? (
            <a className="btn btn-secondary" href={exportHref}>
              ייצוא Excel
            </a>
          ) : null}
          {canEdit ? (
            <Link className="btn btn-primary" href={`/events/${eventId}/invitations/new`}>
              הזמנה חדשה
            </Link>
          ) : null}
          {canBulkDelete && eligibleCount > 0 ? (
            <BulkSoftDeleteControl
              eventId={eventId}
              filters={filters}
              listedCount={rows.length}
              eligibleCount={eligibleCount}
              isFamilyMember={role === "family_member"}
            />
          ) : null}
        </div>
      </div>
      {canBulkDelete && rows.length > 0 && eligibleCount === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">
          אין הזמנות שנוצרו על ידכם בין המוצגות, ולכן אין מה למחוק.
        </p>
      ) : null}

      <form className="card grid gap-3 p-4 md:grid-cols-3">
        <input
          className="input md:col-span-3"
          name="q"
          placeholder="חיפוש לפי שם, טלפון או קבוצה"
          defaultValue={q}
        />
        <select className="select" name="status" defaultValue={status}>
          <option value="">כל הסטטוסים</option>
          {Object.entries(INVITATION_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select className="select" name="side" defaultValue={side}>
          <option value="">כל הצדדים</option>
          {Object.entries(INVITING_SIDE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select className="select" name="followUp" defaultValue={followUp}>
          <option value="">כל המעקבים</option>
          <option value="today">להיום</option>
          <option value="overdue">באיחור</option>
        </select>
        <select className="select" name="group" defaultValue={group}>
          <option value="">כל הקבוצות</option>
          {group && !groupNames.includes(group) ? <option value={group}>{group}</option> : null}
          {groupNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select className="select" name="sort" defaultValue={sort}>
          <option value="name">מיון לפי שם</option>
          <option value="status">מיון לפי סטטוס</option>
          <option value="follow_up">מיון לפי מעקב</option>
          <option value="last_contacted">מיון לפי יצירת קשר</option>
          <option value="created">מיון לפי יצירה</option>
        </select>
        <button className="btn btn-secondary md:col-span-3 w-fit" type="submit">
          סינון
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="אין הזמנות להצגה"
          body="הוסיפו הזמנה או ייבוא קובץ כדי להתחיל."
          action={
            canEdit ? (
              <Link className="btn btn-primary" href={`/events/${eventId}/invitations/new`}>
                הזמנה חדשה
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {rows.map((row) => {
              const tel = telHref(row.phone, row.phone_normalized);
              const wa = whatsappHref(row.phone, row.phone_normalized);
              return (
                <article key={row.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/events/${eventId}/invitations/${row.id}`} className="text-lg font-bold">
                      {row.household_name}
                    </Link>
                    <InvitationStatusChip status={row.status} />
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {row.phone || "ללא טלפון"} · {row.adults + row.children} מוזמנים
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <SideChip side={row.inviting_side} />
                    {row.group_name ? <span className="chip chip-not_contacted">{row.group_name}</span> : null}
                    <span className="chip chip-not_contacted">מעקב {formatDateJerusalem(row.follow_up_on)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tel ? (
                      <a className="btn btn-secondary" href={tel}>
                        חיוג
                      </a>
                    ) : null}
                    {wa ? (
                      <a className="btn btn-secondary" href={wa} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    ) : null}
                    {canEdit ? <MarkContactedButton eventId={eventId} invitationId={row.id} /> : null}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="table-wrap card hidden lg:block">
            <table className="data">
              <thead>
                <tr>
                  <th>שם</th>
                  <th>טלפון</th>
                  <th>סטטוס</th>
                  <th>צד</th>
                  <th>קבוצה</th>
                  <th>מוזמנים</th>
                  <th>מעקב</th>
                  <th>יצירת קשר אחרון</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const tel = telHref(row.phone, row.phone_normalized);
                  const wa = whatsappHref(row.phone, row.phone_normalized);
                  return (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/events/${eventId}/invitations/${row.id}`} className="font-semibold">
                          {row.household_name}
                        </Link>
                      </td>
                      <td>{row.phone || "—"}</td>
                      <td>
                        <InvitationStatusChip status={row.status} />
                      </td>
                      <td>
                        <SideChip side={row.inviting_side} />
                      </td>
                      <td>{row.group_name || "—"}</td>
                      <td>
                        {row.adults}+{row.children}
                      </td>
                      <td>{formatDateJerusalem(row.follow_up_on)}</td>
                      <td>{formatDateTimeJerusalem(row.last_contacted_at)}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {tel ? (
                            <a className="btn btn-secondary" href={tel}>
                              חיוג
                            </a>
                          ) : null}
                          {wa ? (
                            <a className="btn btn-secondary" href={wa} target="_blank" rel="noreferrer">
                              WhatsApp
                            </a>
                          ) : null}
                          {canEdit ? <MarkContactedButton eventId={eventId} invitationId={row.id} /> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
