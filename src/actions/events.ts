"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { COVER_ERRORS, isEventId } from "@/lib/event-cover";
import { deleteCoverObjectByUrl, uploadEventCoverObject } from "@/lib/event-cover-storage";
import { getEvent, insertActivity, insertEvent, updateEvent, updateEventCoverImage } from "@/lib/queries";
import { EVENT_STATUSES, EVENT_TYPES, type EventStatus, type EventType } from "@/lib/domain";

function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}
function isEventStatus(value: string): value is EventStatus {
  return (EVENT_STATUSES as readonly string[]).includes(value);
}

function revalidateEventPaths(eventId: string) {
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/dashboard`);
}

export async function saveEventAction(eventId: string | null, formData: FormData) {
  const user = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 0);
  if (!name) return { ok: false as const, error: "יש להזין שם אירוע." };
  if (!Number.isInteger(capacity) || capacity <= 0) {
    return { ok: false as const, error: "קיבולת חייבת להיות מספר שלם גדול מאפס." };
  }
  const eventTypeRaw = String(formData.get("eventType") ?? "wedding");
  const statusRaw = String(formData.get("status") ?? "draft");
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const values = {
    name,
    eventType: isEventType(eventTypeRaw) ? eventTypeRaw : "wedding",
    status: isEventStatus(statusRaw) ? statusRaw : "draft",
    startsAt: startsAtRaw ? new Date(startsAtRaw).toISOString() : null,
    location: String(formData.get("location") ?? "").trim() || null,
    capacity,
    ownersText: String(formData.get("ownersText") ?? "").trim() || null,
    actorId: user.id,
  };

  if (!eventId) {
    const created = await insertEvent(values);
    await insertActivity({
      eventId: created.id,
      actorId: user.id,
      action: "event.created",
      summary: `נוצר אירוע «${created.name}»`,
    });
    revalidateEventPaths(created.id);
    return { ok: true as const, id: created.id };
  }

  const updated = await updateEvent({ id: eventId, ...values });
  await insertActivity({
    eventId: updated.id,
    actorId: user.id,
    action: "event.updated",
    summary: `עודכן אירוע «${updated.name}»`,
  });
  revalidateEventPaths(updated.id);
  return { ok: true as const, id: updated.id };
}

export async function uploadEventCoverAction(eventId: string, formData: FormData) {
  const user = await requireAdmin();
  if (!isEventId(eventId)) {
    return { ok: false as const, error: COVER_ERRORS.eventNotFound };
  }
  const event = await getEvent(eventId);
  if (!event) {
    return { ok: false as const, error: COVER_ERRORS.eventNotFound };
  }

  const file = formData.get("coverImage");
  if (!file || typeof file === "string") {
    return { ok: false as const, error: COVER_ERRORS.missingFile };
  }

  const uploaded = await uploadEventCoverObject(eventId, file);
  if (!uploaded.ok) return uploaded;

  const previousUrl = event.cover_image_url;
  const updated = await updateEventCoverImage(eventId, uploaded.url, user.id);
  if (!updated) {
    await deleteCoverObjectByUrl(uploaded.url);
    return { ok: false as const, error: COVER_ERRORS.eventNotFound };
  }

  if (previousUrl && previousUrl !== uploaded.url) {
    await deleteCoverObjectByUrl(previousUrl);
  }

  await insertActivity({
    eventId,
    actorId: user.id,
    action: "event.cover_uploaded",
    summary: `הועלתה תמונת כיסוי לאירוע «${updated.name}»`,
  });
  revalidateEventPaths(eventId);
  return { ok: true as const, url: uploaded.url };
}

export async function removeEventCoverAction(eventId: string) {
  const user = await requireAdmin();
  if (!isEventId(eventId)) {
    return { ok: false as const, error: COVER_ERRORS.eventNotFound };
  }
  const event = await getEvent(eventId);
  if (!event) {
    return { ok: false as const, error: COVER_ERRORS.eventNotFound };
  }

  if (event.cover_image_url) {
    await deleteCoverObjectByUrl(event.cover_image_url);
  }

  const updated = await updateEventCoverImage(eventId, null, user.id);
  if (!updated) {
    return { ok: false as const, error: COVER_ERRORS.eventNotFound };
  }

  await insertActivity({
    eventId,
    actorId: user.id,
    action: "event.cover_removed",
    summary: `הוסרה תמונת כיסוי מאירוע «${updated.name}»`,
  });
  revalidateEventPaths(eventId);
  return { ok: true as const };
}
