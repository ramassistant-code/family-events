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

export const MISSING_COUNT_COLUMNS_WARNING =
  "לא זוהו עמודות מבוגרים/ילדים — נעשה שימוש בברירת מחדל 1/0";

export const DUPLICATE_PHONE_SKIP_WARNING =
  "טלפון כפול באירוע — הרשומה תדולג ולא תיווצר";

type MappedColumn = keyof ImportRow | "skip" | "totalGuests";

const HEADER_MAP: Record<string, MappedColumn> = {
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
  מבוגר: "adults",
  "מבוגר/ים": "adults",
  "כמות מבוגרים": "adults",
  "מספר מבוגרים": "adults",
  "מס' מבוגרים": "adults",
  "מס מבוגרים": "adults",
  אורחים: "adults",
  "כמות אורחים": "adults",
  "מספר אורחים": "adults",
  adults: "adults",
  adult: "adults",
  "num adults": "adults",
  "number of adults": "adults",
  "no of adults": "adults",
  "qty adults": "adults",
  "quantity adults": "adults",
  "adults count": "adults",
  // Production files use «כמות» as total guests → adults; children stay 0 unless a ילדים column exists.
  כמות: "totalGuests",
  ילדים: "children",
  ילד: "children",
  "ילד/ים": "children",
  "כמות ילדים": "children",
  "מספר ילדים": "children",
  "מס' ילדים": "children",
  "מס ילדים": "children",
  children: "children",
  child: "children",
  kids: "children",
  kid: "children",
  "num children": "children",
  "number of children": "children",
  "no of children": "children",
  "qty children": "children",
  "children count": "children",
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

/** Trim, collapse spaces, strip bidi/punctuation so «מס' מבוגרים» and «מבוגר/ים» match. */
export function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[\u00A0\u202F\u2007\u2009]/g, " ")
    .replace(/\//g, "")
    .replace(/[-–—_]/g, " ")
    .replace(/[.'"׳״`’‘“”:;#*?()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const NORMALIZED_HEADER_MAP: Record<string, MappedColumn> = {};
for (const [alias, field] of Object.entries(HEADER_MAP)) {
  NORMALIZED_HEADER_MAP[normalizeHeader(alias)] = field;
}

function lookupHeader(raw: string): MappedColumn | null {
  const normalized = normalizeHeader(raw);
  if (!normalized) return null;
  return NORMALIZED_HEADER_MAP[normalized] ?? null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseCount(value: string | null | undefined, fallback: number): { value: number; error?: string } {
  if (value == null) return { value: fallback };
  const raw = String(value).trim();
  if (!raw) return { value: fallback };
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    return { value: fallback, error: "מספר לא תקין" };
  }
  // Accept Excel integer-valued floats (2.0) but reject 2.5.
  if (n !== Math.trunc(n)) {
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
): { rows: ImportRow[]; error?: string; fileWarnings: string[] } {
  if (table.length === 0) {
    return { rows: [], error: "הקובץ ריק", fileWarnings: [] };
  }
  const header = table[0];
  const mapped = header.map((cell) => lookupHeader(cell));
  if (!mapped.some((col) => col === "householdName")) {
    return { rows: [], error: "חסרה עמודת שם / משפחה", fileWarnings: [] };
  }
  const data = table.slice(1);
  if (data.length > MAX_IMPORT_ROWS) {
    return { rows: [], error: `לא ניתן לייבא יותר מ־${MAX_IMPORT_ROWS} שורות`, fileWarnings: [] };
  }

  const hasAdultsCol = mapped.includes("adults");
  const hasChildrenCol = mapped.includes("children");
  const hasTotalGuestsCol = mapped.includes("totalGuests");
  const missingCountColumns = !hasAdultsCol && !hasChildrenCol && !hasTotalGuestsCol;
  const fileWarnings = missingCountColumns ? [MISSING_COUNT_COLUMNS_WARNING] : [];

  const existing = new Set(existingNormalizedPhones);
  const seenInFile = new Map<string, number>();
  const rows: ImportRow[] = [];

  data.forEach((cells, index) => {
    const line = index + 2;
    const get = (key: keyof ImportRow | "totalGuests") => {
      const col = mapped.findIndex((item) => item === key);
      return col >= 0 ? emptyToNull(cells[col]) : null;
    };

    const warnings: string[] = [];
    const errors: string[] = [];
    if (missingCountColumns) warnings.push(MISSING_COUNT_COLUMNS_WARNING);
    const householdName = get("householdName") ?? "";
    if (!householdName) errors.push("חסר שם הזמנה");

    const phone = get("phone");
    const phoneNormalized = normalizePhone(phone);
    if (phoneNormalized) {
      if (existing.has(phoneNormalized)) {
        warnings.push(DUPLICATE_PHONE_SKIP_WARNING);
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

    const adults = parseCount(hasAdultsCol ? get("adults") : get("totalGuests"), 1);
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

  return { rows, fileWarnings };
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

/** Create-only import: skip phones that already exist as active invitations for the event. */
export function partitionConfirmImportRows(
  rows: ImportRow[],
  existingNormalizedPhones: Iterable<string>,
): { toCreate: ImportRow[]; skipped: number } {
  const existing = new Set(existingNormalizedPhones);
  const toCreate: ImportRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    if (row.errors.length > 0 || !row.householdName) continue;
    if (row.phoneNormalized && existing.has(row.phoneNormalized)) {
      skipped += 1;
      continue;
    }
    toCreate.push(row);
  }

  return { toCreate, skipped };
}
