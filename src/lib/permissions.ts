import type { AppRole, MembershipRole } from "./domain";

export type AccessUser = {
  id: string;
  isSystemAdmin: boolean;
};

export function eventRoleForUser(
  user: AccessUser,
  membershipRole: MembershipRole | null,
): AppRole | null {
  if (user.isSystemAdmin) return "system_admin";
  return membershipRole;
}

export function canManageEventsAndUsers(role: AppRole | null): boolean {
  return role === "system_admin";
}

export function canViewEvent(role: AppRole | null): boolean {
  return role === "system_admin" || role === "family_member" || role === "event_manager";
}

export function canEditInvitations(role: AppRole | null): boolean {
  return role === "system_admin" || role === "family_member";
}

export function canImportInvitations(role: AppRole | null): boolean {
  return canEditInvitations(role);
}

export function canExportInvitations(role: AppRole | null): boolean {
  return canViewEvent(role);
}

export function canSoftDeleteInvitation(
  role: AppRole | null,
  actorId: string,
  createdBy: string | null,
): boolean {
  if (role === "system_admin") return true;
  if (role === "family_member") return createdBy === actorId;
  return false;
}

export function canRestoreInvitation(role: AppRole | null): boolean {
  return role === "system_admin";
}

export function canViewFullActivity(role: AppRole | null): boolean {
  return role === "system_admin" || role === "family_member";
}

export function canViewActivitySummary(role: AppRole | null): boolean {
  return canViewEvent(role);
}
