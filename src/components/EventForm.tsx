"use client";

import { saveEventAction } from "@/actions/events";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, type EventStatus, type EventType } from "@/lib/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventForm({
  event,
}: {
  event?: {
    id: string;
    name: string;
    event_type: EventType;
    status: EventStatus;
    starts_at: Date | string | null;
    location: string | null;
    capacity: number;
    owners_text: string | null;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const startsAt =
    event?.starts_at != null
      ? new Date(event.starts_at).toISOString().slice(0, 16)
      : "";

  return (
    <form
      className="card grid gap-4 p-5 md:grid-cols-2"
      onSubmit={async (formEvent) => {
        formEvent.preventDefault();
        const result = await saveEventAction(event?.id ?? null, new FormData(formEvent.currentTarget));
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push("/admin/events");
        router.refresh();
      }}
    >
      <label className="field md:col-span-2">
        <span>שם האירוע</span>
        <input className="input" name="name" defaultValue={event?.name ?? ""} required />
      </label>
      <label className="field">
        <span>סוג</span>
        <select className="select" name="eventType" defaultValue={event?.event_type ?? "wedding"}>
          {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>סטטוס</span>
        <select className="select" name="status" defaultValue={event?.status ?? "draft"}>
          {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>תאריך ושעה</span>
        <input className="input" type="datetime-local" name="startsAt" defaultValue={startsAt} />
      </label>
      <label className="field">
        <span>קיבולת</span>
        <input className="input" type="number" min={1} name="capacity" defaultValue={event?.capacity ?? 100} required />
      </label>
      <label className="field md:col-span-2">
        <span>מקום</span>
        <input className="input" name="location" defaultValue={event?.location ?? ""} />
      </label>
      <label className="field md:col-span-2">
        <span>בעלי האירוע</span>
        <input className="input" name="ownersText" defaultValue={event?.owners_text ?? ""} />
      </label>
      {error ? <p className="md:col-span-2 text-[var(--no)]">{error}</p> : null}
      <button className="btn btn-primary w-fit" type="submit">
        שמירה
      </button>
    </form>
  );
}
