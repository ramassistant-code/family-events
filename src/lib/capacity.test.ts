import { describe, expect, it } from "vitest";
import { summarizeCapacity } from "./capacity";

describe("capacity", () => {
  it("counts adults and children 1:1 and excludes soft-deleted rows", () => {
    const stats = summarizeCapacity(
      [
        { status: "confirmed", invitingSide: "bride", adults: 2, children: 2 },
        { status: "confirmed", invitingSide: "groom", adults: 4, children: 2, deleted: true },
        { status: "awaiting", invitingSide: "shared", adults: 2, children: 0 },
        { status: "declined", invitingSide: "other", adults: 1, children: 0 },
      ],
      10,
    );
    expect(stats.confirmedGuests).toBe(4);
    expect(stats.totalGuests).toBe(7);
    expect(stats.activeInvites).toBe(3);
    expect(stats.bySide.bride.confirmedGuests).toBe(4);
    expect(stats.bySide.groom.confirmedGuests).toBe(0);
    expect(stats.progress).toBe(0.4);
    expect(stats.overflow).toBe(false);
  });

  it("marks overflow when confirmed guests exceed capacity", () => {
    const stats = summarizeCapacity(
      [{ status: "confirmed", invitingSide: "bride", adults: 8, children: 4 }],
      10,
    );
    expect(stats.overflow).toBe(true);
  });
});
