import { describe, expect, it } from "vitest";
import { planGroupRename } from "./group-rename";

const existingGroupNames = ["חברים", "שכנים"];

describe("planGroupRename", () => {
  it("plans a rename from an existing group to a trimmed new name", () => {
    expect(planGroupRename({ oldGroupName: "שכנים", newGroupName: "  שכנים מרחוב הרצל  ", existingGroupNames })).toEqual(
      { ok: true, from: "שכנים", to: "שכנים מרחוב הרצל" },
    );
  });

  it("requires a selected group", () => {
    expect(planGroupRename({ oldGroupName: "   ", newGroupName: "חדש", existingGroupNames })).toEqual({
      ok: false,
      error: "יש לבחור קבוצה קיימת.",
    });
  });

  it("rejects a group that does not exist in the event", () => {
    expect(planGroupRename({ oldGroupName: "עבודה", newGroupName: "חדש", existingGroupNames })).toEqual({
      ok: false,
      error: "הקבוצה שנבחרה אינה קיימת באירוע.",
    });
  });

  it("requires a non-blank new name so a rename never clears the group", () => {
    expect(planGroupRename({ oldGroupName: "שכנים", newGroupName: "   ", existingGroupNames })).toEqual({
      ok: false,
      error: "יש להזין שם קבוצה חדש.",
    });
  });

  it("rejects a new name equal to the old one", () => {
    expect(planGroupRename({ oldGroupName: "שכנים", newGroupName: " שכנים ", existingGroupNames })).toEqual({
      ok: false,
      error: "שם הקבוצה החדש זהה לשם הקיים.",
    });
  });

  it("allows merging into another existing group", () => {
    expect(planGroupRename({ oldGroupName: "שכנים", newGroupName: "חברים", existingGroupNames })).toEqual({
      ok: true,
      from: "שכנים",
      to: "חברים",
    });
  });
});
