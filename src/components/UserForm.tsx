"use client";

import { saveUserAction } from "@/actions/users";
import { ROLE_LABELS, type MembershipRole } from "@/lib/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

type EventOption = { id: string; name: string };

export function UserForm({
  user,
  events,
  memberships,
}: {
  user?: {
    id: string;
    email: string;
    name: string;
    is_system_admin: boolean;
    is_active: boolean;
  };
  events: EventOption[];
  memberships: { event_id: string; role: MembershipRole }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState(user?.is_system_admin ?? false);

  return (
    <form
      className="card grid gap-4 p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await saveUserAction(user?.id ?? null, new FormData(event.currentTarget));
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push("/admin/users");
        router.refresh();
      }}
    >
      <label className="field">
        <span>שם</span>
        <input className="input" name="name" defaultValue={user?.name ?? ""} required />
      </label>
      <label className="field">
        <span>אימייל</span>
        <input className="input" type="email" name="email" defaultValue={user?.email ?? ""} required={user == null} disabled={user != null} />
      </label>
      <label className="field">
        <span>{user ? "סיסמה חדשה (אופציונלי)" : "סיסמה"}</span>
        <input className="input" type="password" name="password" minLength={user ? 0 : 8} required={user == null} />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="isSystemAdmin"
          defaultChecked={user?.is_system_admin}
          onChange={(event) => setAdmin(event.target.checked)}
        />
        מנהל מערכת
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="isActive" defaultChecked={user?.is_active ?? true} />
        חשבון פעיל
      </label>

      {!admin ? (
        <fieldset className="grid gap-3 rounded-xl border border-[var(--line)] p-3">
          <legend className="px-1 font-semibold">שיוך לאירועים</legend>
          {events.map((event) => {
            const current = memberships.find((item) => item.event_id === event.id);
            return (
              <label key={event.id} className="grid gap-1 md:grid-cols-[1fr_180px] md:items-center">
                <span>{event.name}</span>
                <select className="select" name="membershipRole" defaultValue={current?.role ?? ""}>
                  <option value="">ללא שיוך</option>
                  <option value="family_member">{ROLE_LABELS.family_member}</option>
                  <option value="event_manager">{ROLE_LABELS.event_manager}</option>
                </select>
                <input type="hidden" name="membershipEventId" value={event.id} />
              </label>
            );
          })}
        </fieldset>
      ) : (
        <p className="text-sm text-[var(--ink-soft)]">מנהל מערכת רואה את כל האירועים בלי שיוך.</p>
      )}

      {error ? <p className="text-[var(--no)]">{error}</p> : null}
      <button className="btn btn-primary w-fit" type="submit">
        שמירה
      </button>
    </form>
  );
}
