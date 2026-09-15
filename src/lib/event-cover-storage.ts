import {
  COVER_ERRORS,
  EVENT_COVERS_BUCKET,
  coverObjectPath,
  storagePathFromPublicUrl,
  validateCoverFile,
} from "./event-cover";
import { getSupabaseAdmin } from "./supabase-admin";

export async function uploadEventCoverObject(
  eventId: string,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const validated = validateCoverFile(file);
  if (!validated.ok) return validated;

  const admin = getSupabaseAdmin();
  if (!admin.ok) return admin;

  const path = coverObjectPath(eventId, validated.ext);
  const body = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.supabase.storage.from(EVENT_COVERS_BUCKET).upload(path, body, {
    contentType: validated.mime,
    upsert: false,
  });
  if (error) {
    return { ok: false, error: COVER_ERRORS.uploadFailed };
  }

  const { data } = admin.supabase.storage.from(EVENT_COVERS_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export async function deleteCoverObjectByUrl(url: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin.ok) return;
  const path = storagePathFromPublicUrl(url, admin.url);
  if (!path) return;
  await admin.supabase.storage.from(EVENT_COVERS_BUCKET).remove([path]);
}
