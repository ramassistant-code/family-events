"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireEventAccess } from "@/lib/access";
import { applyMarkContacted, applyStatusChange } from "@/lib/contact";
import { todayInJerusalem } from "@/lib/dates";
import { DEFAULT_INVITATION_STATUS, isInvitationStatus, isInvitingSide } from "@/lib/domain";
import { planGroupRename } from "@/lib/group-rename";
import {
  normalizeInvitationGroupName,
  parseListedInvitationFilters,
  type ListedInvitationFilterInput,
} from "@/lib/invitation-filters";
import {
  canBulkSoftDelete,
  canEditInvitations,
  canImportInvitations,
  canRestoreInvitation,
  canSoftDeleteInvitation,
  invitationGroupRenameScope,
  invitationsEligibleForSoftDelete,
} from "@/lib/permissions";
import { normalizePhone } from "@/lib/phone";
import {
  findDuplicatePhone,
  getInvitation,
  insertActivity,
  insertInvitation,
  listActiveNormalizedPhones,
  listInvitationGroupNames,
  listInvitations,
  renameInvitationGroup,
  restoreInvitation,
  softDeleteInvitation,
  softDeleteInvitations,
  updateInvitation,
} from "@/lib/queries";
import { excelFileToTable } from "@/lib/export";
import { importSummary, parseCsv, partitionConfirmImportRows, previewImport, type ImportRow } from "@/lib/import";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value ? value : null;
}

function intField(formData: FormData, key: string, fallback: number): number {
  const raw = text(formData, key);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return fallback;
  return value;
}

export type SaveInvitationResult =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | { ok: false; code: "NO_PHONE" }
  | { ok: false; code: "DUPLICATE_PHONE"; existingName: string };

export async function saveInvitationAction(
  eventId: string,
  invitationId: string | null,
  formData: FormData,
): Promise<SaveInvitationResult> {
  const { user, role } = await requireEventAccess(eventId);
  if (!canEditInvitations(role)) {
    return { ok: false, error: "אין הרשאה לערוך הזמנות." };
  }

  const householdName = text(formData, "householdName");
  if (!householdName) {
    return { ok: false, error: "יש להזין שם הזמנה." };
  }

  const phone = optional(formData, "phone");
  const phoneNormalized = normalizePhone(phone);
  const acknowledgeNoPhone = formData.get("acknowledgeNoPhone") === "true";
  const acknowledgeDuplicate = formData.get("acknowledgeDuplicate") === "true";

  if (!phone && !acknowledgeNoPhone) {
    return { ok: false, code: "NO_PHONE" };
  }

  if (phoneNormalized) {
    const existing = await findDuplicatePhone(eventId, phoneNormalized, invitationId ?? undefined);
    if (existing && !acknowledgeDuplicate) {
      return { ok: false, code: "DUPLICATE_PHONE", existingName: existing.household_name };
    }
  }

  const invitingSideRaw = text(formData, "invitingSide") || "other";
  const invitingSide = isInvitingSide(invitingSideRaw) ? invitingSideRaw : "other";
  const statusRaw = text(formData, "status") || DEFAULT_INVITATION_STATUS;
  const status = isInvitationStatus(statusRaw) ? statusRaw : DEFAULT_INVITATION_STATUS;
  const followUpOn = optional(formData, "followUpOn");
  const today = todayInJerusalem();

  const payload = {
    eventId,
    householdName,
    phone,
    phoneNormalized,
    invitingSide,
    adults: intField(formData, "adults", 1),
    children: intField(formData, "children", 0),
    status,
    followUpOn,
    foodNotes: optional(formData, "foodNotes"),
    accessibilityNotes: optional(formData, "accessibilityNotes"),
    transportNotes: optional(formData, "transportNotes"),
    notes: optional(formData, "notes"),
    groupName: normalizeInvitationGroupName(text(formData, "groupName")),
  };

  if (!invitationId) {
    const created = await insertInvitation({
      ...payload,
      status: DEFAULT_INVITATION_STATUS,
      followUpOn: payload.followUpOn,
      createdBy: user.id,
    });
    await insertActivity({
      eventId,
      invitationId: created.id,
      actorId: user.id,
      action: "invitation.created",
      summary: `נוצרה הזמנה «${householdName}»`,
    });
    revalidatePath(`/events/${eventId}`);
    return { ok: true, id: created.id };
  }

  const previous = await getInvitation(eventId, invitationId);
  if (!previous || previous.deleted_at) {
    return { ok: false, error: "ההזמנה לא נמצאה." };
  }

  const statusChange = applyStatusChange({
    previousStatus: previous.status,
    nextStatus: status,
    followUpOn,
    today,
  });

  const updated = await updateInvitation({
    id: invitationId,
    ...payload,
    followUpOn: statusChange.followUpOn,
    lastContactedAt: statusChange.touchLastContacted ? new Date() : undefined,
    updatedBy: user.id,
  });

  if (previous.status !== updated.status) {
    await insertActivity({
      eventId,
      invitationId,
      actorId: user.id,
      action: "invitation.status_changed",
      summary: `סטטוס «${householdName}» עודכן`,
      details: { from: previous.status, to: updated.status },
    });
  } else {
    await insertActivity({
      eventId,
      invitationId,
      actorId: user.id,
      action: "invitation.updated",
      summary: `עודכנה הזמנה «${householdName}»`,
    });
  }

  revalidatePath(`/events/${eventId}`);
  return { ok: true, id: updated.id };
}

export async function markContactedAction(eventId: string, invitationId: string) {
  const { user, role } = await requireEventAccess(eventId);
  if (!canEditInvitations(role)) {
    return { ok: false as const, error: "אין הרשאה." };
  }
  const invitation = await getInvitation(eventId, invitationId);
  if (!invitation || invitation.deleted_at) {
    return { ok: false as const, error: "ההזמנה לא נמצאה." };
  }
  const next = applyMarkContacted({
    status: invitation.status,
    followUpOn: invitation.follow_up_on,
    today: todayInJerusalem(),
  });
  await updateInvitation({
    id: invitation.id,
    eventId,
    householdName: invitation.household_name,
    phone: invitation.phone,
    phoneNormalized: invitation.phone_normalized,
    invitingSide: invitation.inviting_side,
    adults: invitation.adults,
    children: invitation.children,
    status: next.status,
    followUpOn: next.followUpOn,
    foodNotes: invitation.food_notes,
    accessibilityNotes: invitation.accessibility_notes,
    transportNotes: invitation.transport_notes,
    notes: invitation.notes,
    groupName: invitation.group_name,
    lastContactedAt: new Date(),
    updatedBy: user.id,
  });
  await insertActivity({
    eventId,
    invitationId,
    actorId: user.id,
    action: "invitation.marked_contacted",
    summary: `סומן «פנינו» עבור «${invitation.household_name}»`,
  });
  revalidatePath(`/events/${eventId}`);
  return { ok: true as const };
}

export async function updateInvitationStatusAction(
  eventId: string,
  invitationId: string,
  nextStatusRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user, role } = await requireEventAccess(eventId);
  if (!canEditInvitations(role)) {
    return { ok: false, error: "אין הרשאה לערוך הזמנות." };
  }
  if (!isInvitationStatus(nextStatusRaw)) {
    return { ok: false, error: "סטטוס לא תקין." };
  }

  const invitation = await getInvitation(eventId, invitationId);
  if (!invitation || invitation.deleted_at) {
    return { ok: false, error: "ההזמנה לא נמצאה." };
  }
  if (invitation.status === nextStatusRaw) {
    return { ok: true };
  }

  const statusChange = applyStatusChange({
    previousStatus: invitation.status,
    nextStatus: nextStatusRaw,
    followUpOn: invitation.follow_up_on,
    today: todayInJerusalem(),
  });

  const updated = await updateInvitation({
    id: invitation.id,
    eventId,
    householdName: invitation.household_name,
    phone: invitation.phone,
    phoneNormalized: invitation.phone_normalized,
    invitingSide: invitation.inviting_side,
    adults: invitation.adults,
    children: invitation.children,
    status: nextStatusRaw,
    followUpOn: statusChange.followUpOn,
    foodNotes: invitation.food_notes,
    accessibilityNotes: invitation.accessibility_notes,
    transportNotes: invitation.transport_notes,
    notes: invitation.notes,
    groupName: invitation.group_name,
    lastContactedAt: statusChange.touchLastContacted ? new Date() : undefined,
    updatedBy: user.id,
  });

  await insertActivity({
    eventId,
    invitationId,
    actorId: user.id,
    action: "invitation.status_changed",
    summary: `סטטוס «${invitation.household_name}» עודכן`,
    details: { from: invitation.status, to: updated.status },
  });
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function softDeleteInvitationAction(eventId: string, invitationId: string) {
  const { user, role } = await requireEventAccess(eventId);
  const invitation = await getInvitation(eventId, invitationId);
  if (!invitation || invitation.deleted_at) {
    return { ok: false as const, error: "ההזמנה לא נמצאה." };
  }
  if (!canSoftDeleteInvitation(role, user.id, invitation.created_by)) {
    return { ok: false as const, error: "ניתן למחוק רק הזמנות שיצרתם." };
  }
  await softDeleteInvitation(eventId, invitationId, user.id);
  await insertActivity({
    eventId,
    invitationId,
    actorId: user.id,
    action: "invitation.soft_deleted",
    summary: `נמחקה הזמנה «${invitation.household_name}»`,
  });
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}/invitations`);
}

export async function bulkSoftDeleteListedInvitationsAction(
  eventId: string,
  filterInput: ListedInvitationFilterInput,
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const { user, role } = await requireEventAccess(eventId);
  if (!canBulkSoftDelete(role)) {
    return { ok: false, error: "אין הרשאה למחוק הזמנות." };
  }

  const filters = parseListedInvitationFilters(filterInput);
  const listed = await listInvitations(eventId, filters);
  const eligible = invitationsEligibleForSoftDelete(role, user.id, listed);

  if (eligible.length === 0) {
    return {
      ok: false,
      error:
        role === "family_member"
          ? "אין הזמנות שנוצרו על ידכם בין המוצגות, ולכן אין מה למחוק."
          : "אין הזמנות למחיקה.",
    };
  }

  const deleted = await softDeleteInvitations(
    eventId,
    eligible.map((invitation) => invitation.id),
    user.id,
  );

  for (const invitation of deleted) {
    await insertActivity({
      eventId,
      invitationId: invitation.id,
      actorId: user.id,
      action: "invitation.soft_deleted",
      summary: `נמחקה הזמנה «${invitation.household_name}»`,
    });
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/trash");
  return { ok: true, deleted: deleted.length };
}

/** Renames a group across the whole event — independent of the current list filters. */
export async function renameInvitationGroupAction(
  eventId: string,
  oldGroupNameRaw: string,
  newGroupNameRaw: string,
): Promise<{ ok: true; updated: number; from: string; to: string } | { ok: false; error: string }> {
  const { user, role } = await requireEventAccess(eventId);
  const scope = invitationGroupRenameScope(role, user.id);
  if (!scope) {
    return { ok: false, error: "אין הרשאה לשנות שם קבוצה." };
  }

  const existingGroupNames = await listInvitationGroupNames(eventId);
  const plan = planGroupRename({
    oldGroupName: oldGroupNameRaw,
    newGroupName: newGroupNameRaw,
    existingGroupNames,
  });
  if (!plan.ok) {
    return { ok: false, error: plan.error };
  }

  const updated = await renameInvitationGroup(
    eventId,
    plan.from,
    plan.to,
    user.id,
    scope.kind === "own" ? scope.userId : undefined,
  );

  if (updated.length === 0) {
    return {
      ok: false,
      error:
        scope.kind === "own"
          ? "אין הזמנות שנוצרו על ידכם בקבוצה הזו, ולכן אין מה לעדכן."
          : "אין הזמנות בקבוצה הזו.",
    };
  }

  await insertActivity({
    eventId,
    actorId: user.id,
    action: "invitation.group_renamed",
    summary: `שם הקבוצה «${plan.from}» שונה ל-«${plan.to}» עבור ${updated.length} הזמנות`,
    details: { updated: updated.length, from: plan.from, to: plan.to },
  });

  revalidatePath(`/events/${eventId}`);
  return { ok: true, updated: updated.length, from: plan.from, to: plan.to };
}

export async function restoreInvitationAction(invitationId: string, eventId: string) {
  const user = await requireAdmin();
  if (!canRestoreInvitation("system_admin")) {
    return { ok: false as const, error: "אין הרשאה." };
  }
  const restored = await restoreInvitation(invitationId, user.id);
  if (!restored) {
    return { ok: false as const, error: "לא נמצאה רשומה למחוק." };
  }
  await insertActivity({
    eventId: restored.event_id,
    invitationId: restored.id,
    actorId: user.id,
    action: "invitation.restored",
    summary: `שוחזרה הזמנה «${restored.household_name}»`,
  });
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/trash");
  return { ok: true as const };
}

export async function previewImportAction(eventId: string, formData: FormData) {
  const { role } = await requireEventAccess(eventId);
  if (!canImportInvitations(role)) {
    return { ok: false as const, error: "אין הרשאה לייבוא." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "יש לבחור קובץ." };
  }

  const name = file.name.toLowerCase();
  let table: string[][] = [];
  try {
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      table = parseCsv(await file.text());
    } else {
      const buffer = Buffer.from(await file.arrayBuffer());
      table = await excelFileToTable(buffer);
    }
  } catch {
    return { ok: false as const, error: "לא ניתן לקרוא את הקובץ." };
  }

  const existing = await listActiveNormalizedPhones(eventId);
  const preview = previewImport(table, existing);
  if (preview.error) {
    return { ok: false as const, error: preview.error };
  }
  return {
    ok: true as const,
    rows: preview.rows,
    summary: importSummary(preview.rows),
    fileWarnings: preview.fileWarnings,
  };
}

export async function confirmImportAction(eventId: string, rows: ImportRow[]) {
  const { user, role } = await requireEventAccess(eventId);
  if (!canImportInvitations(role)) {
    return { ok: false as const, error: "אין הרשאה לייבוא." };
  }
  const existing = await listActiveNormalizedPhones(eventId);
  const { toCreate, skipped } = partitionConfirmImportRows(rows, existing);
  let created = 0;
  for (const row of toCreate) {
    await insertInvitation({
      eventId,
      householdName: row.householdName,
      phone: row.phone,
      phoneNormalized: row.phoneNormalized,
      invitingSide: row.invitingSide,
      adults: row.adults,
      children: row.children,
      status: DEFAULT_INVITATION_STATUS,
      followUpOn: null,
      foodNotes: row.foodNotes,
      accessibilityNotes: row.accessibilityNotes,
      transportNotes: row.transportNotes,
      notes: row.notes,
      groupName: row.groupName,
      createdBy: user.id,
    });
    created += 1;
  }
  await insertActivity({
    eventId,
    actorId: user.id,
    action: "invitation.imported",
    summary:
      skipped > 0
        ? `יובאו ${created} הזמנות חדשות, דולגו ${skipped}`
        : `יובאו ${created} הזמנות חדשות`,
    details: { created, skipped, warnings: rows.filter((row) => row.warnings.length > 0).length },
  });
  revalidatePath(`/events/${eventId}`);
  return { ok: true as const, created, skipped };
}
