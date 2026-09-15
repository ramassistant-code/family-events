"use client";

import { removeEventCoverAction, saveEventAction, uploadEventCoverAction } from "@/actions/events";
import { EventCoverImage } from "@/components/EventCoverImage";
import { COVER_ACCEPT } from "@/lib/event-cover";
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
    cover_image_url: string | null;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState(event?.id ?? null);
  const [coverUrl, setCoverUrl] = useState(event?.cover_image_url ?? null);
  const [pending, setPending] = useState(false);
  const startsAt =
    event?.starts_at != null
      ? new Date(event.starts_at).toISOString().slice(0, 16)
      : "";

  return (
    <form
      className="card grid gap-4 p-5 md:grid-cols-2"
      onSubmit={async (formEvent) => {
        formEvent.preventDefault();
        const form = formEvent.currentTarget;
        setPending(true);
        setError(null);
        try {
          const formData = new FormData(form);
          formData.delete("coverImage");
          const result = await saveEventAction(eventId, formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setEventId(result.id);
          if (!event?.id) {
            window.history.replaceState(null, "", `/admin/events/${result.id}`);
          }

          const fileInput = form.elements.namedItem("coverImage");
          const coverInput = fileInput instanceof HTMLInputElement ? fileInput : null;
          const file = coverInput?.files?.[0] ?? null;
          if (coverInput && file) {
            const uploadData = new FormData();
            uploadData.set("coverImage", file);
            const uploaded = await uploadEventCoverAction(result.id, uploadData);
            if (!uploaded.ok) {
              setError(uploaded.error);
              return;
            }
            setCoverUrl(uploaded.url);
            coverInput.value = "";
          }

          router.push("/admin/events");
          router.refresh();
        } finally {
          setPending(false);
        }
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
      <div className="field md:col-span-2">
        <span>תמונת כיסוי</span>
        <p className="text-sm text-[var(--ink-soft)]">JPG, PNG או WebP, עד 5MB. מנהל מערכת בלבד.</p>
        {coverUrl ? (
          <div className="mt-1 flex items-center gap-3">
            <EventCoverImage src={coverUrl} alt="תמונת כיסוי נוכחית" variant="thumb" />
            <button
              className="btn btn-danger"
              type="button"
              disabled={pending || !eventId}
              onClick={async () => {
                if (!eventId) return;
                setPending(true);
                setError(null);
                try {
                  const removed = await removeEventCoverAction(eventId);
                  if (!removed.ok) {
                    setError(removed.error);
                    return;
                  }
                  setCoverUrl(null);
                  router.refresh();
                } finally {
                  setPending(false);
                }
              }}
            >
              הסרת תמונה
            </button>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">אין תמונת כיסוי</p>
        )}
        <input className="input mt-2" type="file" name="coverImage" accept={COVER_ACCEPT} disabled={pending} />
      </div>
      {error ? <p className="md:col-span-2 text-[var(--no)]">{error}</p> : null}
      <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
        שמירה
      </button>
    </form>
  );
}
