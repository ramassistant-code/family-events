import { AppShell } from "@/components/AppShell";
import { requireAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AppShell
      title="ניהול מערכת"
      role="system_admin"
      userName={user.name}
      items={[
        { href: "/admin/events", label: "אירועים" },
        { href: "/admin/users", label: "משתמשים" },
        { href: "/admin/trash", label: "מחוקים" },
      ]}
      moreItems={[{ href: "/events", label: "חזרה לאירועים" }]}
    >
      {children}
    </AppShell>
  );
}
