"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { insertActivity, insertEvent, updateEvent } from "@/lib/queries";
import { EVENT_STATUSES, EVENT_TYPES, type EventStatus, type EventType } from "@/lib/domain";

function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}
function isEventStatus(value: string): value is EventStatus {
  return (EVENT_STATUSES as readonly string[]).includes(value);
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
    revalidatePath("/admin/events");
    revalidatePath("/events");
    return { ok: true as const, id: created.id };
  }

  const updated = await updateEvent({ id: eventId, ...values });
  await insertActivity({
    eventId: updated.id,
    actorId: user.id,
    action: "event.updated",
    summary: `עודכן אירוע «${updated.name}»`,
  });
  revalidatePath("/admin/events");
  revalidatePath(`/events/${updated.id}`);
  return { ok: true as const, id: updated.id };
}
