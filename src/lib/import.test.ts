import { describe, expect, it } from "vitest";
import { importSummary, MISSING_COUNT_COLUMNS_WARNING, normalizeHeader, parseCsv, previewImport } from "./import";
import { DEFAULT_INVITATION_STATUS } from "./domain";
import { canSoftDeleteInvitation, canEditInvitations, canImportInvitations } from "./permissions";

describe("import preview", () => {
  it("normalizes headers without stripping Hebrew letters", () => {
    expect(normalizeHeader("שם")).toBe("שם");
    expect(normalizeHeader("מבוגר/ים")).toBe("מבוגרים");
    expect(normalizeHeader("מס' מבוגרים")).toBe("מס מבוגרים");
    expect(normalizeHeader("  כמות   מבוגרים ")).toBe("כמות מבוגרים");
    expect(normalizeHeader("num_adults")).toBe("num adults");
  });

  it("parses Hebrew CSV and warns on duplicate phones without upserting", () => {
    const csv = `שם,טלפון,צד מזמין,מבוגרים,ילדים
משפחת א,0501234567,כלה,2,1
משפחת ב,0501234567,חתן,2,0
,0501111111,אחר,1,0`;
    const table = parseCsv(csv);
    const preview = previewImport(table, ["+972501234567"]);
    expect(preview.error).toBeUndefined();
    expect(preview.rows).toHaveLength(3);
    expect(preview.rows[0].warnings.some((item) => item.includes("כפול"))).toBe(true);
    expect(preview.rows[1].warnings.some((item) => item.includes("בתוך הקובץ"))).toBe(true);
    expect(preview.rows[2].errors).toContain("חסר שם הזמנה");
    expect(preview.rows[0].status).toBe(DEFAULT_INVITATION_STATUS);
    const summary = importSummary(preview.rows);
    expect(summary.valid).toBe(2);
    expect(summary.errors).toBe(1);
  });

  it("maps the קבוצה column onto groupName", () => {
    const csv = `שם,טלפון,קבוצה,מבוגרים,ילדים
משפחת א,0501234567,אבא כלה – שכנים,2,1
משפחת ב,0501111111,,1,0`;
    const table = parseCsv(csv);
    const preview = previewImport(table, []);
    expect(preview.error).toBeUndefined();
    expect(preview.fileWarnings).toEqual([]);
    expect(preview.rows[0].groupName).toBe("אבא כלה – שכנים");
    expect(preview.rows[1].groupName).toBeNull();
    expect(preview.rows[0].warnings).toEqual([]);
  });

  it("maps alternate Hebrew and English adults/children headers after normalization", () => {
    const cases: Array<{ headers: string[]; adults: number; children: number }> = [
      { headers: ["שם", "מבוגר", "ילד"], adults: 2, children: 1 },
      { headers: ["שם", "מבוגר/ים", "ילד/ים"], adults: 3, children: 2 },
      { headers: ["שם", "כמות מבוגרים", "מספר ילדים"], adults: 4, children: 0 },
      { headers: ["שם", "מס' מבוגרים", "מס' ילדים"], adults: 1, children: 3 },
      { headers: ["שם", "  אורחים  ", "kids"], adults: 5, children: 1 },
      { headers: ["שם", "כמות   מבוגרים", "ילדים"], adults: 2, children: 0 },
      { headers: ["שם", "Adult", "Child"], adults: 2, children: 2 },
      { headers: ["שם", "num_adults", "qty children"], adults: 6, children: 4 },
    ];
    for (const testCase of cases) {
      const preview = previewImport([testCase.headers, ["משפחה", String(testCase.adults), String(testCase.children)]], []);
      expect(preview.error, testCase.headers.join("|")).toBeUndefined();
      expect(preview.fileWarnings, testCase.headers.join("|")).toEqual([]);
      expect(preview.rows[0]?.adults, testCase.headers.join("|")).toBe(testCase.adults);
      expect(preview.rows[0]?.children, testCase.headers.join("|")).toBe(testCase.children);
      expect(preview.rows[0]?.errors, testCase.headers.join("|")).toEqual([]);
    }
  });

  it("accepts Excel-like integer-valued numeric strings", () => {
    const preview = previewImport(
      [
        ["שם", "מבוגרים", "ילדים"],
        ["משפחה א", "2.0", "1.00"],
        ["משפחה ב", "3,0", "0"],
        ["משפחה ג", " 4 ", "2"],
      ],
      [],
    );
    expect(preview.error).toBeUndefined();
    expect(preview.rows[0].adults).toBe(2);
    expect(preview.rows[0].children).toBe(1);
    expect(preview.rows[1].adults).toBe(3);
    expect(preview.rows[2].adults).toBe(4);
    expect(preview.rows.every((row) => row.errors.length === 0)).toBe(true);
  });

  it("rejects non-integer counts with a Hebrew error instead of silently using 1/0", () => {
    const preview = previewImport(
      [
        ["שם", "מבוגרים", "ילדים"],
        ["משפחה", "2.5", "שלוש"],
      ],
      [],
    );
    expect(preview.rows[0].errors).toEqual(["מבוגרים: מספר לא תקין", "ילדים: מספר לא תקין"]);
    const summary = importSummary(preview.rows);
    expect(summary.valid).toBe(0);
    expect(summary.errors).toBe(1);
  });

  it("warns when neither adults nor children columns are mapped", () => {
    const preview = previewImport(
      [
        ["שם", "טלפון"],
        ["משפחה א", "0501234567"],
      ],
      [],
    );
    expect(preview.error).toBeUndefined();
    expect(preview.fileWarnings).toEqual([MISSING_COUNT_COLUMNS_WARNING]);
    expect(preview.rows[0].warnings).toContain(MISSING_COUNT_COLUMNS_WARNING);
    expect(preview.rows[0].adults).toBe(1);
    expect(preview.rows[0].children).toBe(0);
    expect(preview.rows[0].errors).toEqual([]);
  });

  it("rejects files above 2000 data rows", () => {
    const header = ["שם"];
    const data = Array.from({ length: 2001 }, () => ["משפחה"]);
    const preview = previewImport([header, ...data], []);
    expect(preview.error).toMatch(/2,000|2000/);
  });
});

describe("permissions", () => {
  it("lets family members edit all invites but delete only their own", () => {
    expect(canEditInvitations("family_member")).toBe(true);
    expect(canImportInvitations("event_manager")).toBe(false);
    expect(canSoftDeleteInvitation("family_member", "u1", "u1")).toBe(true);
    expect(canSoftDeleteInvitation("family_member", "u1", "u2")).toBe(false);
    expect(canSoftDeleteInvitation("event_manager", "u1", "u1")).toBe(false);
    expect(canSoftDeleteInvitation("system_admin", "u1", "u2")).toBe(true);
  });
});
