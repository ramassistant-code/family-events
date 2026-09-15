import { describe, expect, it } from "vitest";
import { normalizeInvitationGroupName, parseListedInvitationFilters } from "./invitation-filters";

describe("parseListedInvitationFilters", () => {
  it("accepts the invitations list query params", () => {
    expect(
      parseListedInvitationFilters({
        q: "  כהן  ",
        status: "confirmed",
        side: "bride",
        followUp: "overdue",
        group: " שכנים ",
      }),
    ).toEqual({
      query: "כהן",
      status: "confirmed",
      side: "bride",
      followUp: "overdue",
      group: "שכנים",
    });
  });

  it("drops invalid enum values so they match an unfiltered listInvitations call", () => {
    expect(
      parseListedInvitationFilters({
        query: "x",
        status: "nope",
        side: "left",
        followUp: "tomorrow",
        group: "",
      }),
    ).toEqual({
      query: "x",
      status: "",
      side: "",
      followUp: "",
      group: "",
    });
  });
});

describe("normalizeInvitationGroupName", () => {
  it("trims a non-empty group and stores blank as null", () => {
    expect(normalizeInvitationGroupName("  שכנים  ")).toBe("שכנים");
    expect(normalizeInvitationGroupName("")).toBeNull();
    expect(normalizeInvitationGroupName("   ")).toBeNull();
  });
});
