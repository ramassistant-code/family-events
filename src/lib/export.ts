import ExcelJS from "exceljs";
import {
  INVITATION_STATUS_LABELS,
  INVITING_SIDE_LABELS,
  type InvitationStatus,
  type InvitingSide,
} from "./domain";
import { formatDateJerusalem, formatDateTimeJerusalem } from "./dates";

export type ExportInvitation = {
  household_name: string;
  phone: string | null;
  inviting_side: InvitingSide;
  adults: number;
  children: number;
  status: InvitationStatus;
  follow_up_on: string | null;
  last_contacted_at: Date | string | null;
  food_notes: string | null;
  accessibility_notes: string | null;
  transport_notes: string | null;
  notes: string | null;
  group_name: string | null;
};

export async function invitationsToExcelBuffer(rows: ExportInvitation[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "family-events";
  const sheet = workbook.addWorksheet("הזמנות", { views: [{ rightToLeft: true }] });
  sheet.columns = [
    { header: "שם הזמנה", key: "name", width: 24 },
    { header: "טלפון", key: "phone", width: 16 },
    { header: "צד מזמין", key: "side", width: 12 },
    { header: "מבוגרים", key: "adults", width: 10 },
    { header: "ילדים", key: "children", width: 10 },
    { header: "סטטוס", key: "status", width: 18 },
    { header: "תאריך מעקב הבא", key: "followUp", width: 16 },
    { header: "יצירת קשר אחרון", key: "lastContacted", width: 20 },
    { header: "רגישויות מזון", key: "food", width: 22 },
    { header: "נגישות", key: "accessibility", width: 18 },
    { header: "הסעה", key: "transport", width: 18 },
    { header: "הערות", key: "notes", width: 24 },
    { header: "קבוצה", key: "group", width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      name: row.household_name,
      phone: row.phone ?? "",
      side: INVITING_SIDE_LABELS[row.inviting_side],
      adults: row.adults,
      children: row.children,
      status: INVITATION_STATUS_LABELS[row.status],
      followUp: formatDateJerusalem(row.follow_up_on),
      lastContacted: formatDateTimeJerusalem(row.last_contacted_at),
      food: row.food_notes ?? "",
      accessibility: row.accessibility_notes ?? "",
      transport: row.transport_notes ?? "",
      notes: row.notes ?? "",
      group: row.group_name ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Flatten an ExcelJS cell value to a string without `String(object)` → `[object Object]`.
 * Handles formula/result, richText, hyperlink, sharedString, numbers, and Cell-like wrappers.
 */
export function excelCellToString(value: unknown): string {
  if (value == null) return "";
  switch (typeof value) {
    case "string":
      return value;
    case "number":
      return Number.isFinite(value) ? String(value) : "";
    case "boolean":
      return value ? "TRUE" : "FALSE";
    case "bigint":
      return String(value);
    default:
      break;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  if (typeof value !== "object") return "";

  const obj = value as Record<string, unknown>;

  // ExcelJS Cell instance (has address/type); CellValue unions do not.
  if ("value" in obj && ("address" in obj || "type" in obj)) {
    const fromValue = excelCellToString(obj.value);
    if (fromValue) return fromValue;
    return typeof obj.text === "string" ? obj.text : "";
  }

  if (Array.isArray(obj.richText)) {
    return obj.richText
      .map((part) => {
        if (part == null) return "";
        if (typeof part === "string") return part;
        if (typeof part === "object" && part && "text" in part) {
          return excelCellToString((part as { text?: unknown }).text);
        }
        return excelCellToString(part);
      })
      .join("");
  }

  if ("formula" in obj || "sharedFormula" in obj) {
    return excelCellToString(obj.result);
  }

  if (typeof obj.error === "string") {
    return "";
  }

  if ("sharedString" in obj) {
    return excelCellToString(obj.sharedString);
  }

  if ("hyperlink" in obj) {
    return excelCellToString(obj.text);
  }

  if (typeof obj.text === "string" && !("value" in obj)) {
    return obj.text;
  }

  if ("result" in obj) {
    return excelCellToString(obj.result);
  }

  // ExcelJS Cell instance: prefer .value, then displayed .text
  if ("value" in obj) {
    const fromValue = excelCellToString(obj.value);
    if (fromValue) return fromValue;
    if (typeof obj.text === "string") return obj.text;
    return "";
  }

  return "";
}

export async function excelFileToTable(buffer: ArrayBuffer | Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs accepts Buffer in Node
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const table: string[][] = [];
  sheet.eachRow((row) => {
    const cells = (row.values as Array<unknown>).slice(1).map((value) => excelCellToString(value));
    table.push(cells);
  });
  return table;
}
