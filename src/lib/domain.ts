export const TIME_ZONE = "Asia/Jerusalem";
export const MAX_IMPORT_ROWS = 2000;
export const DEFAULT_SEED_PASSWORD = "FamilyEvents!2026";

export const INVITATION_STATUSES = [
  "not_contacted",
  "awaiting",
  "considering",
  "confirmed",
  "declined",
] as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  not_contacted: "טרם פנינו",
  awaiting: "ממתינים לתשובה",
  considering: "מתלבטים",
  confirmed: "אישרו",
  declined: "סירבו",
};

export const DEFAULT_INVITATION_STATUS: InvitationStatus = "not_contacted";

export const INVITING_SIDES = ["bride", "groom", "shared", "other"] as const;
export type InvitingSide = (typeof INVITING_SIDES)[number];

export const INVITING_SIDE_LABELS: Record<InvitingSide, string> = {
  bride: "כלה",
  groom: "חתן",
  shared: "משותף",
  other: "אחר",
};

export const EVENT_STATUSES = ["draft", "active", "ended", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "טיוטה",
  active: "פעיל",
  ended: "הסתיים",
  cancelled: "בוטל",
};

export const EVENT_TYPES = ["wedding", "bar_bat_mitzvah", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "חתונה",
  bar_bat_mitzvah: "בר/בת מצווה",
  other: "אחר",
};

export const MEMBERSHIP_ROLES = ["family_member", "event_manager"] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];
export type AppRole = "system_admin" | MembershipRole;

export const ROLE_LABELS: Record<AppRole, string> = {
  system_admin: "מנהל מערכת",
  family_member: "בן משפחה",
  event_manager: "מנהל אירוע",
};

export function isInvitationStatus(value: string): value is InvitationStatus {
  return (INVITATION_STATUSES as readonly string[]).includes(value);
}

export function isInvitingSide(value: string): value is InvitingSide {
  return (INVITING_SIDES as readonly string[]).includes(value);
}

export function parseInvitationStatusLabel(raw: string | null | undefined): InvitationStatus | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (isInvitationStatus(trimmed)) return trimmed;
  const match = (Object.entries(INVITATION_STATUS_LABELS) as [InvitationStatus, string][]).find(
    ([, label]) => label === trimmed,
  );
  return match?.[0] ?? null;
}

export function parseInvitingSideLabel(raw: string | null | undefined): InvitingSide | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (isInvitingSide(trimmed)) return trimmed;
  const extras: Record<string, InvitingSide> = {
    "צד הכלה": "bride",
    "צד החתן": "groom",
  };
  if (trimmed in extras) return extras[trimmed];
  const match = (Object.entries(INVITING_SIDE_LABELS) as [InvitingSide, string][]).find(
    ([, label]) => label === trimmed,
  );
  return match?.[0] ?? null;
}
