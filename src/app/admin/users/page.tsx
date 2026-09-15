import { requireAdmin } from "@/lib/access";
import { listUsers } from "@/lib/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listUsers();
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="page-title">משתמשים</h2>
        <Link className="btn btn-primary" href="/admin/users/new">
          משתמש חדש
        </Link>
      </div>
      <div className="grid gap-3">
        {users.map((user) => (
          <Link key={user.id} href={`/admin/users/${user.id}`} className="card card-interactive p-4">
            <h3 className="font-display text-lg">{user.name}</h3>
            <p className="text-sm text-[var(--ink-soft)]">
              {user.email} · {user.is_system_admin ? "מנהל מערכת" : "משתמש"} · {user.is_active ? "פעיל" : "מושבת"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
