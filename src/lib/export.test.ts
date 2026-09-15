import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { excelCellToString, excelFileToTable } from "./export";

describe("excelCellToString", () => {
  it("never stringifies objects to [object Object]", () => {
    expect(excelCellToString({ formula: "1+1", result: 2 })).toBe("2");
    expect(excelCellToString({ formula: "A1", result: 2.0 })).toBe("2");
    expect(excelCellToString({ sharedFormula: "A1", result: 3 })).toBe("3");
    expect(excelCellToString({ richText: [{ text: "משפ" }, { text: "חה" }] })).toBe("משפחה");
    expect(excelCellToString({ text: "קישור", hyperlink: "https://example.com" })).toBe("קישור");
    expect(excelCellToString({ sharedString: "שם" })).toBe("שם");
    expect(excelCellToString(4)).toBe("4");
    expect(excelCellToString(0)).toBe("0");
    expect(excelCellToString({ error: "#REF!" })).toBe("");
    expect(excelCellToString({ address: "B2", type: 2, value: { formula: "1+1", result: 5 }, text: "5" })).toBe("5");
    expect(excelCellToString({ mystery: true })).toBe("");
    expect(excelCellToString({ mystery: true })).not.toBe("[object Object]");
  });
});

describe("excelFileToTable", () => {
  it("flattens formula result cells when reading xlsx", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("sheet");
    sheet.addRow(["שם", "מבוגרים", "ילדים"]);
    const row = sheet.addRow(["משפחה", { formula: "1+1", result: 2 }, 1]);
    row.getCell(2).value = { formula: "1+1", result: 2 };
    const buffer = await workbook.xlsx.writeBuffer();
    const table = await excelFileToTable(Buffer.from(buffer));
    expect(table[0]).toEqual(["שם", "מבוגרים", "ילדים"]);
    expect(table[1]?.[0]).toBe("משפחה");
    expect(table[1]?.[1]).not.toBe("[object Object]");
    expect(table[1]?.[1]).toBe("2");
    expect(table[1]?.[2]).toBe("1");
  });
});
