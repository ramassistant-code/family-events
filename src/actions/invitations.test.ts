import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Action-level coverage for the group rename: permission scoping, validation wiring and
 * independence from the list filters. The queries module is replaced by an in-memory store
 * that mirrors the SQL predicates of `renameInvitationGroup` (active rows, exact group match,
 * optional creator restriction).
 */

type FakeInvitation = {
  id: string;
  group_name: string | null;
  created_by: string | null;
  deleted_at: Date | null;
};

let invitations: FakeInvitation[] = [];
const activities: Record<string, unknown>[] = [];
let access = { user: { id: "admin" }, role: "system_admin" as string | null };

const listInvitations = vi.fn(async () => invitations.filter((row) => !row.deleted_at));

vi.mock("@/lib/access", () => ({
  requireAdmin: vi.fn(async () => access.user),
  requireEventAccess: vi.fn(async () => access),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("@/lib/queries", () => ({
  findDuplicatePhone: vi.fn(),
  getInvitation: vi.fn(),
  insertInvitation: vi.fn(),
  listActiveNormalizedPhones: vi.fn(async () => []),
  restoreInvitation: vi.fn(),
  softDeleteInvitation: vi.fn(),
  softDeleteInvitations: vi.fn(async () => []),
  updateInvitation: vi.fn(),
  listInvitations,
  insertActivity: vi.fn(async (values: { action: string; summary: string; details?: Record<string, unknown> }) => {
    activities.push(values);
  }),
  listInvitationGroupNames: vi.fn(async () =>
    [
      ...new Set(
        invitations
          .filter((row) => !row.deleted_at && row.group_name?.trim())
          .map((row) => row.group_name as string),
      ),
    ].sort(),
  ),
  renameInvitationGroup: vi.fn(
    async (
      _eventId: string,
      fromGroupName: string,
      toGroupName: string,
      _actorId: string,
      onlyCreatedBy?: string,
    ) => {
      const matched = invitations.filter(
        (row) =>
          !row.deleted_at &&
          row.group_name === fromGroupName &&
          (!onlyCreatedBy || row.created_by === onlyCreatedBy),
      );
      for (const row of matched) row.group_name = toGroupName;
      return matched;
    },
  ),
}));

const { renameInvitationGroupAction } = await import("./invitations");

function groupsById() {
  return Object.fromEntries(invitations.map((row) => [row.id, row.group_name]));
}

beforeEach(() => {
  activities.length = 0;
  listInvitations.mockClear();
  access = { user: { id: "admin" }, role: "system_admin" };
  invitations = [
    { id: "a", group_name: "שכנים", created_by: "u1", deleted_at: null },
    { id: "b", group_name: "שכנים", created_by: "u2", deleted_at: null },
    { id: "c", group_name: "חברים", created_by: "u1", deleted_at: null },
    { id: "d", group_name: null, created_by: "u1", deleted_at: null },
    { id: "deleted", group_name: "שכנים", created_by: "u1", deleted_at: new Date() },
  ];
});

describe("renameInvitationGroupAction", () => {
  it("renames the group on every active invitation and leaves other groups untouched", async () => {
    const result = await renameInvitationGroupAction("e1", "שכנים", "  שכנים מרחוב הרצל ");

    expect(result).toEqual({ ok: true, updated: 2, from: "שכנים", to: "שכנים מרחוב הרצל" });
    expect(groupsById()).toEqual({
      a: "שכנים מרחוב הרצל",
      b: "שכנים מרחוב הרצל",
      c: "חברים",
      d: null,
      deleted: "שכנים",
    });
  });

  it("never consults the list filters", async () => {
    await renameInvitationGroupAction("e1", "שכנים", "אחר");
    expect(listInvitations).not.toHaveBeenCalled();
  });

  it("logs the rename to the activity log", async () => {
    await renameInvitationGroupAction("e1", "שכנים", "אחר");
    expect(activities).toEqual([
      {
        eventId: "e1",
        actorId: "admin",
        action: "invitation.group_renamed",
        summary: "שם הקבוצה «שכנים» שונה ל-«אחר» עבור 2 הזמנות",
        details: { updated: 2, from: "שכנים", to: "אחר" },
      },
    ]);
  });

  it("renames only the family member's own invitations", async () => {
    access = { user: { id: "u1" }, role: "family_member" };

    const result = await renameInvitationGroupAction("e1", "שכנים", "שלי");

    expect(result).toEqual({ ok: true, updated: 1, from: "שכנים", to: "שלי" });
    expect(groupsById().a).toBe("שלי");
    expect(groupsById().b).toBe("שכנים");
  });

  it("reports when the family member has no invitation in the selected group", async () => {
    access = { user: { id: "u2" }, role: "family_member" };

    const result = await renameInvitationGroupAction("e1", "חברים", "שלי");

    expect(result).toEqual({
      ok: false,
      error: "אין הזמנות שנוצרו על ידכם בקבוצה הזו, ולכן אין מה לעדכן.",
    });
    expect(groupsById().c).toBe("חברים");
  });

  it("rejects roles without invitation-edit permission", async () => {
    access = { user: { id: "u3" }, role: "event_manager" };

    expect(await renameInvitationGroupAction("e1", "שכנים", "אחר")).toEqual({
      ok: false,
      error: "אין הרשאה לשנות שם קבוצה.",
    });
    expect(groupsById().a).toBe("שכנים");
  });

  it("rejects an unknown group and a blank new name", async () => {
    expect(await renameInvitationGroupAction("e1", "לא קיים", "אחר")).toEqual({
      ok: false,
      error: "הקבוצה שנבחרה אינה קיימת באירוע.",
    });
    expect(await renameInvitationGroupAction("e1", "שכנים", "   ")).toEqual({
      ok: false,
      error: "יש להזין שם קבוצה חדש.",
    });
    expect(groupsById().a).toBe("שכנים");
  });

  it("merges into an existing group when the new name is already in use", async () => {
    const result = await renameInvitationGroupAction("e1", "חברים", "שכנים");

    expect(result).toEqual({ ok: true, updated: 1, from: "חברים", to: "שכנים" });
    expect(groupsById()).toMatchObject({ a: "שכנים", b: "שכנים", c: "שכנים" });
  });
});
