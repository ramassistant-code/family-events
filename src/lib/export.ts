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

export async function excelFileToTable(buffer: ArrayBuffer | Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs accepts Buffer in Node
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const table: string[][] = [];
  sheet.eachRow((row) => {
    const cells = (row.values as Array<unknown>).slice(1).map((value) => {
      if (value == null) return "";
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      if (typeof value === "object" && value && "text" in (value as { text?: string })) {
        return String((value as { text?: string }).text ?? "");
      }
      return String(value);
    });
    table.push(cells);
  });
  return table;
}
