import { remainingUntil } from "./dates";
import { describe, expect, it } from "vitest";

describe("remainingUntil", () => {
  it("returns null for missing or invalid dates", () => {
    expect(remainingUntil(null)).toBeNull();
    expect(remainingUntil("not-a-date")).toBeNull();
  });

  it("splits a future timestamp into days, hours, and minutes", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    const remaining = remainingUntil("2026-09-17T15:10:00.000Z", now);
    expect(remaining).toMatchObject({ past: false, days: 2, hours: 3, minutes: 10 });
  });

  it("marks past timestamps", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    const remaining = remainingUntil("2026-09-15T11:00:00.000Z", now);
    expect(remaining?.past).toBe(true);
    expect(remaining?.hours).toBe(1);
  });
});
