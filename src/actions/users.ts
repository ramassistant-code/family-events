"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { MEMBERSHIP_ROLES, type MembershipRole } from "@/lib/domain";
import { getUserByEmail, insertUser, replaceMemberships, updateUser } from "@/lib/queries";

function isMembershipRole(value: string): value is MembershipRole {
  return (MEMBERSHIP_ROLES as readonly string[]).includes(value);
}

function parseMemberships(formData: FormData): { eventId: string; role: MembershipRole }[] {
  const eventIds = formData.getAll("membershipEventId").map(String);
  const roles = formData.getAll("membershipRole").map(String);
  const result: { eventId: string; role: MembershipRole }[] = [];
  eventIds.forEach((eventId, index) => {
    const role = roles[index];
    if (!eventId || !isMembershipRole(role)) return;
    result.push({ eventId, role });
  });
  return result;
}

export async function saveUserAction(userId: string | null, formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const isSystemAdmin = formData.get("isSystemAdmin") === "on";
  const isActive = formData.get("isActive") === "on";
  if (!name) return { ok: false as const, error: "יש להזין שם." };
  if (!userId && !email) return { ok: false as const, error: "יש להזין אימייל." };
  if (!userId && password.length < 8) {
    return { ok: false as const, error: "סיסמה חייבת להכיל לפחות 8 תווים." };
  }

  const memberships = parseMemberships(formData);

  if (!userId) {
    const existing = await getUserByEmail(email);
    if (existing) return { ok: false as const, error: "האימייל כבר קיים במערכת." };
    const created = await insertUser({
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12),
      isSystemAdmin,
      isActive,
    });
    await replaceMemberships(created.id, isSystemAdmin ? [] : memberships);
    revalidatePath("/admin/users");
    return { ok: true as const, id: created.id };
  }

  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  const updated = await updateUser({
    id: userId,
    name,
    isSystemAdmin,
    isActive,
    passwordHash,
  });
  await replaceMemberships(updated.id, isSystemAdmin ? [] : memberships);
  revalidatePath("/admin/users");
  return { ok: true as const, id: updated.id };
}
