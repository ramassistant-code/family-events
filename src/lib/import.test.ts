import { describe, expect, it } from "vitest";
import { importSummary, parseCsv, previewImport } from "./import";
import { DEFAULT_INVITATION_STATUS } from "./domain";
import { canSoftDeleteInvitation, canEditInvitations, canImportInvitations } from "./permissions";

describe("import preview", () => {
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
