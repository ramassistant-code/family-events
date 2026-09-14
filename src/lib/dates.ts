import { TIME_ZONE } from "./domain";

export function todayInJerusalem(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function plusDaysJerusalem(days: number, now = new Date()): string {
  return addDaysToDateString(todayInJerusalem(now), days);
}

export function formatDateTimeJerusalem(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatDateJerusalem(value: Date | string | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("he-IL", {
      timeZone: TIME_ZONE,
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(new Date(Date.UTC(year, month - 1, day, 12)));
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
  }).format(date);
}

export function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return todayInJerusalem(date);
  }
  return todayInJerusalem(value);
}
