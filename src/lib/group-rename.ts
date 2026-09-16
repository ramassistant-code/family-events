import { normalizeInvitationGroupName } from "./invitation-filters";

export type GroupRenameInput = {
  /** Value picked from the combo of existing event groups. */
  oldGroupName: string;
  newGroupName: string;
  /** Same source as the list filter: `listInvitationGroupNames`. */
  existingGroupNames: string[];
};

export type GroupRenamePlan = { ok: true; from: string; to: string } | { ok: false; error: string };

/**
 * Validates a group rename: the old name must be an existing event group, the new
 * name must be non-blank and different. Renaming onto another existing group merges them.
 */
export function planGroupRename({
  oldGroupName,
  newGroupName,
  existingGroupNames,
}: GroupRenameInput): GroupRenamePlan {
  const from = oldGroupName.trim();
  if (!from) {
    return { ok: false, error: "יש לבחור קבוצה קיימת." };
  }
  if (!existingGroupNames.includes(from)) {
    return { ok: false, error: "הקבוצה שנבחרה אינה קיימת באירוע." };
  }

  const to = normalizeInvitationGroupName(newGroupName);
  if (!to) {
    return { ok: false, error: "יש להזין שם קבוצה חדש." };
  }
  if (to === from) {
    return { ok: false, error: "שם הקבוצה החדש זהה לשם הקיים." };
  }

  return { ok: true, from, to };
}
