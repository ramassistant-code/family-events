import { requireEventAccess } from "@/lib/access";
import { canExportInvitations } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExportPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { role } = await requireEventAccess(eventId);
  if (!canExportInvitations(role)) {
    redirect(`/events/${eventId}/invitations`);
  }
  const qs = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      typeof value === "string" && value ? [[key, value]] : [],
    ),
  );

  return (
    <div className="card grid max-w-lg gap-3 p-6">
      <h2 className="page-title">ייצוא Excel</h2>
      <p className="text-[var(--ink-soft)]">
        הקובץ כולל רגישויות מזון, נגישות והסעה. רשומות שנמחקו לא ייכללו.
      </p>
      <a className="btn btn-primary w-fit" href={`/api/events/${eventId}/export?${qs.toString()}`}>
        הורדה
      </a>
      <Link className="text-[var(--wine)]" href={`/events/${eventId}/invitations`}>
        חזרה לרשימה
      </Link>
    </div>
  );
}
