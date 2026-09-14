import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getEvent, getMembership } from "./queries";
import { eventRoleForUser } from "./permissions";
import type { AppRole } from "./domain";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    isSystemAdmin: Boolean(session.user.isSystemAdmin),
  };
}

export async function requireEventAccess(eventId: string): Promise<{
  user: Awaited<ReturnType<typeof requireSession>>;
  role: AppRole;
  event: NonNullable<Awaited<ReturnType<typeof getEvent>>>;
}> {
  const user = await requireSession();
  const event = await getEvent(eventId);
  if (!event) {
    redirect("/events");
  }
  if (user.isSystemAdmin) {
    return { user, role: "system_admin", event };
  }
  const membership = await getMembership(eventId, user.id);
  if (!membership) {
    redirect("/events");
  }
  const role = eventRoleForUser(user, membership.role);
  if (!role) {
    redirect("/events");
  }
  return { user, role, event };
}

export async function requireAdmin() {
  const user = await requireSession();
  if (!user.isSystemAdmin) {
    redirect("/events");
  }
  return user;
}
