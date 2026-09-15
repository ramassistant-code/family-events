export const EVENT_COVERS_BUCKET = "event-covers";
export const COVER_MAX_BYTES = 5 * 1024 * 1024;

export const COVER_MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const COVER_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export const COVER_ERRORS = {
  missingFile: "יש לבחור קובץ תמונה.",
  invalidType: "יש להעלות קובץ תמונה בפורמט JPG, PNG או WebP.",
  tooLarge: "גודל התמונה לא יכול לעלות על 5MB.",
  notConfigured: "אחסון התמונות אינו מוגדר. פנו למנהל המערכת.",
  uploadFailed: "העלאת התמונה נכשלה. בדקו את הגדרות האחסון.",
  eventNotFound: "האירוע לא נמצא.",
} as const;

export type CoverFileLike = {
  type?: string | null;
  size: number;
  name?: string | null;
};

export type CoverValidation =
  | { ok: true; mime: string; ext: string }
  | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEventId(value: string): boolean {
  return UUID_RE.test(value);
}

function extFromFileName(name?: string | null): string | null {
  const match = name?.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!match) return null;
  if (match[1] === "jpg" || match[1] === "jpeg") return "jpg";
  if (match[1] === "png") return "png";
  if (match[1] === "webp") return "webp";
  return null;
}

function mimeFromExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export function validateCoverFile(file: CoverFileLike | null | undefined): CoverValidation {
  if (!file || file.size <= 0) {
    return { ok: false, error: COVER_ERRORS.missingFile };
  }
  if (file.size > COVER_MAX_BYTES) {
    return { ok: false, error: COVER_ERRORS.tooLarge };
  }

  const mime = (file.type ?? "").toLowerCase().trim();
  const mimeExt = mime ? COVER_MIME_TO_EXT[mime as keyof typeof COVER_MIME_TO_EXT] : undefined;
  if (mimeExt) {
    return { ok: true, mime: mime === "image/jpg" ? "image/jpeg" : mime, ext: mimeExt };
  }

  if (!mime) {
    const nameExt = extFromFileName(file.name);
    if (nameExt) {
      return { ok: true, mime: mimeFromExt(nameExt), ext: nameExt };
    }
  }

  return { ok: false, error: COVER_ERRORS.invalidType };
}

export function coverObjectPath(eventId: string, ext: string): string {
  return `${eventId}/${crypto.randomUUID()}.${ext}`;
}

export function storagePathFromPublicUrl(url: string, supabaseUrl?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${EVENT_COVERS_BUCKET}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(idx + marker.length));
    if (!path || path.includes("..")) return null;

    if (supabaseUrl) {
      const expectedHost = new URL(supabaseUrl).host;
      if (parsed.host !== expectedHost) return null;
    }

    return path;
  } catch {
    return null;
  }
}
