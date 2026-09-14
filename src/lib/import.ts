import {
  DEFAULT_INVITATION_STATUS,
  MAX_IMPORT_ROWS,
  parseInvitationStatusLabel,
  parseInvitingSideLabel,
  type InvitationStatus,
  type InvitingSide,
} from "./domain";
import { normalizePhone } from "./phone";

export type ImportRow = {
  line: number;
  householdName: string;
  phone: string | null;
  phoneNormalized: string | null;
  invitingSide: InvitingSide;
  adults: number;
  children: number;
  status: InvitationStatus;
  followUpOn: string | null;
  foodNotes: string | null;
  accessibilityNotes: string | null;
  transportNotes: string | null;
  notes: string | null;
  groupName: string | null;
  warnings: string[];
  errors: string[];
};

const HEADER_MAP: Record<string, keyof ImportRow | "skip"> = {
  שם: "householdName",
  "שם משפחה": "householdName",
  משפחה: "householdName",
  "שם הזמנה": "householdName",
  household: "householdName",
  name: "householdName",
  טלפון: "phone",
  phone: "phone",
  "צד מזמין": "invitingSide",
  צד: "invitingSide",
  side: "invitingSide",
  מבוגרים: "adults",
  adults: "adults",
  ילדים: "children",
  children: "children",
  סטטוס: "status",
  status: "status",
  "רגישויות מזון": "foodNotes",
  רגישויות: "foodNotes",
  מזון: "foodNotes",
  food: "foodNotes",
  נגישות: "accessibilityNotes",
  accessibility: "accessibilityNotes",
  הסעה: "transportNotes",
  הסעות: "transportNotes",
  תחבורה: "transportNotes",
  transport: "transportNotes",
  הערות: "notes",
  notes: "notes",
  קבוצה: "groupName",
  group: "groupName",
  "תאריך מעקב": "followUpOn",
  מעקב: "followUpOn",
  follow_up: "followUpOn",
  followup: "followUpOn",
};

function cleanHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function lookupHeader(raw: string): keyof ImportRow | "skip" | null {
  const exact = HEADER_MAP[raw.trim()] ?? HEADER_MAP[cleanHeader(raw)];
  if (exact) return exact;
  const lower = cleanHeader(raw);
  const match = Object.entries(HEADER_MAP).find(([key]) => key.toLowerCase() === lower);
  return match?.[1] ?? null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseCount(value: string | null | undefined, fallback: number): { value: number; error?: string } {
  if (!value || !value.trim()) return { value: fallback };
  const n = Number(String(value).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return { value: fallback, error: "מספר לא תקין" };
  }
  return { value: n };
}

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : firstLine.split(";").length > firstLine.split(",").length
      ? ";"
      : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  row.push(cell.replace(/\r$/, ""));
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function previewImport(
  table: string[][],
  existingNormalizedPhones: string[],
): { rows: ImportRow[]; error?: string } {
  if (table.length === 0) {
    return { rows: [], error: "הקובץ ריק" };
  }
  const header = table[0];
  const mapped = header.map((cell) => lookupHeader(cell));
  if (!mapped.some((col) => col === "householdName")) {
    return { rows: [], error: "חסרה עמודת שם / משפחה" };
  }
  const data = table.slice(1);
  if (data.length > MAX_IMPORT_ROWS) {
    return { rows: [], error: `לא ניתן לייבא יותר מ־${MAX_IMPORT_ROWS} שורות` };
  }

  const existing = new Set(existingNormalizedPhones);
  const seenInFile = new Map<string, number>();
  const rows: ImportRow[] = [];

  data.forEach((cells, index) => {
    const line = index + 2;
    const get = (key: keyof ImportRow) => {
      const col = mapped.findIndex((item) => item === key);
      return col >= 0 ? emptyToNull(cells[col]) : null;
    };

    const warnings: string[] = [];
    const errors: string[] = [];
    const householdName = get("householdName") ?? "";
    if (!householdName) errors.push("חסר שם הזמנה");

    const phone = get("phone");
    const phoneNormalized = normalizePhone(phone);
    if (phoneNormalized) {
      if (existing.has(phoneNormalized)) {
        warnings.push("טלפון כפול באירוע — הרשומה תיווצר בכל זאת, בלי לעדכן את הקיימת");
      }
      const previous = seenInFile.get(phoneNormalized);
      if (previous) {
        warnings.push(`טלפון כפול בתוך הקובץ (שורה ${previous})`);
      }
      seenInFile.set(phoneNormalized, line);
    }

    const sideRaw = get("invitingSide");
    const invitingSide = parseInvitingSideLabel(sideRaw) ?? "other";
    if (sideRaw && !parseInvitingSideLabel(sideRaw)) {
      warnings.push("צד מזמין לא זוהה — נשמר כ«אחר»");
    }

    const adults = parseCount(get("adults"), 1);
    const children = parseCount(get("children"), 0);
    if (adults.error) errors.push(`מבוגרים: ${adults.error}`);
    if (children.error) errors.push(`ילדים: ${children.error}`);

    const statusRaw = get("status");
    const parsedStatus = parseInvitationStatusLabel(statusRaw);
    const status = parsedStatus ?? DEFAULT_INVITATION_STATUS;
    if (statusRaw && !parsedStatus) {
      warnings.push("סטטוס לא זוהה — נשמר כ«טרם פנינו»");
    }

    rows.push({
      line,
      householdName,
      phone,
      phoneNormalized,
      invitingSide,
      adults: adults.value,
      children: children.value,
      status,
      followUpOn: get("followUpOn"),
      foodNotes: get("foodNotes"),
      accessibilityNotes: get("accessibilityNotes"),
      transportNotes: get("transportNotes"),
      notes: get("notes"),
      groupName: get("groupName"),
      warnings,
      errors,
    });
  });

  return { rows };
}

export function importSummary(rows: ImportRow[]) {
  const valid = rows.filter((row) => row.errors.length === 0);
  const withWarnings = valid.filter((row) => row.warnings.length > 0);
  const invalid = rows.filter((row) => row.errors.length > 0);
  return {
    total: rows.length,
    valid: valid.length,
    warnings: withWarnings.length,
    errors: invalid.length,
  };
}
