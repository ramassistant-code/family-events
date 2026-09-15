import { describe, expect, it } from "vitest";
import {
  canBulkSoftDelete,
  canEditInvitations,
  canImportInvitations,
  canSoftDeleteInvitation,
  invitationsEligibleForSoftDelete,
} from "./permissions";

describe("soft-delete permissions", () => {
  it("lets family members edit all invites but delete only their own", () => {
    expect(canEditInvitations("family_member")).toBe(true);
    expect(canImportInvitations("event_manager")).toBe(false);
    expect(canSoftDeleteInvitation("family_member", "u1", "u1")).toBe(true);
    expect(canSoftDeleteInvitation("family_member", "u1", "u2")).toBe(false);
    expect(canSoftDeleteInvitation("event_manager", "u1", "u1")).toBe(false);
    expect(canSoftDeleteInvitation("system_admin", "u1", "u2")).toBe(true);
  });

  it("shows bulk delete to system admin and family member only", () => {
    expect(canBulkSoftDelete("system_admin")).toBe(true);
    expect(canBulkSoftDelete("family_member")).toBe(true);
    expect(canBulkSoftDelete("event_manager")).toBe(false);
    expect(canBulkSoftDelete(null)).toBe(false);
  });

  it("selects all listed invitations for a system admin", () => {
    const listed = [{ id: "a", created_by: "u1" }, { id: "b", created_by: "u2" }, { id: "c", created_by: null }];
    expect(invitationsEligibleForSoftDelete("system_admin", "admin", listed).map((row) => row.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("selects only the family member's own invitations among the listed set", () => {
    const listed = [
      { id: "mine", created_by: "u1" },
      { id: "theirs", created_by: "u2" },
      { id: "unknown", created_by: null },
    ];
    expect(invitationsEligibleForSoftDelete("family_member", "u1", listed).map((row) => row.id)).toEqual(["mine"]);
    expect(invitationsEligibleForSoftDelete("family_member", "u2", listed)).toHaveLength(1);
    expect(invitationsEligibleForSoftDelete("family_member", "nobody", listed)).toEqual([]);
  });

  it("selects nothing for an event manager", () => {
    const listed = [{ id: "a", created_by: "u1" }];
    expect(invitationsEligibleForSoftDelete("event_manager", "u1", listed)).toEqual([]);
  });
});
