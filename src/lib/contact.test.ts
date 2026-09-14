import { describe, expect, it } from "vitest";
import { addDaysToDateString, todayInJerusalem } from "./dates";
import { applyMarkContacted, applyStatusChange, classifyFollowUp } from "./contact";

describe("follow-up and last-contacted rules", () => {
  const today = "2026-09-14";

  it("fills follow_up_on with today+7 when empty after mark contacted", () => {
    const result = applyMarkContacted({
      status: "not_contacted",
      followUpOn: null,
      today,
    });
    expect(result.status).toBe("awaiting");
    expect(result.followUpOn).toBe("2026-09-21");
    expect(result.touchLastContacted).toBe(true);
  });

  it("does not overwrite an existing follow_up_on", () => {
    const marked = applyMarkContacted({
      status: "considering",
      followUpOn: "2026-09-20",
      today,
    });
    expect(marked.status).toBe("considering");
    expect(marked.followUpOn).toBe("2026-09-20");

    const status = applyStatusChange({
      previousStatus: "not_contacted",
      nextStatus: "awaiting",
      followUpOn: "2026-10-01",
      today,
    });
    expect(status.followUpOn).toBe("2026-10-01");
    expect(status.touchLastContacted).toBe(true);
  });

  it("does not touch last_contacted when editing notes-equivalent status stays the same", () => {
    const result = applyStatusChange({
      previousStatus: "awaiting",
      nextStatus: "awaiting",
      followUpOn: "2026-09-20",
      today,
    });
    expect(result.touchLastContacted).toBe(false);
    expect(result.followUpOn).toBe("2026-09-20");
  });

  it("classifies today and overdue, and ignores empty or terminal statuses", () => {
    expect(classifyFollowUp(today, "awaiting", today)).toBe("today");
    expect(classifyFollowUp("2026-09-01", "considering", today)).toBe("overdue");
    expect(classifyFollowUp(null, "awaiting", today)).toBeNull();
    expect(classifyFollowUp("2026-09-01", "confirmed", today)).toBeNull();
    expect(classifyFollowUp("2026-09-01", "declined", today)).toBeNull();
    expect(classifyFollowUp("2026-09-30", "awaiting", today)).toBeNull();
  });

  it("adds calendar days without shifting the date string", () => {
    expect(addDaysToDateString(today, 7)).toBe("2026-09-21");
    expect(todayInJerusalem(new Date("2026-09-14T22:00:00+03:00"))).toBe("2026-09-14");
  });
});
