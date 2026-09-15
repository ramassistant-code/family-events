import { AppShell } from "@/components/AppShell";
import { requireEventAccess } from "@/lib/access";
import { canManageEventsAndUsers } from "@/lib/permissions";
import { formatDateJerusalem } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { user, role, event } = await requireEventAccess(eventId);
  const admin = canManageEventsAndUsers(role);

  return (
    <AppShell
      title={event.name}
      subtitle={event.starts_at ? formatDateJerusalem(event.starts_at) : undefined}
      coverImageUrl={event.cover_image_url}
      role={role}
      userName={user.name}
      items={[
        { href: `/events/${eventId}/dashboard`, label: "דשבורד" },
        { href: `/events/${eventId}/invitations`, label: "הזמנות" },
        { href: `/events/${eventId}/activity`, label: "פעילות" },
      ]}
      moreItems={[
        { href: "/events", label: "החלפת אירוע" },
        ...(admin
          ? [
              { href: "/admin/events", label: "אירועים" },
              { href: "/admin/users", label: "משתמשים" },
              { href: "/admin/trash", label: "מחוקים" },
            ]
          : []),
      ]}
    >
      {children}
    </AppShell>
  );
}
