"use client";

import { markContactedAction, saveInvitationAction, softDeleteInvitationAction } from "@/actions/invitations";
import {
  INVITATION_STATUS_LABELS,
  INVITING_SIDE_LABELS,
  type InvitationStatus,
  type InvitingSide,
} from "@/lib/domain";
import { telHref, whatsappHref } from "@/lib/phone";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type InvitationFormValues = {
  id?: string;
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

export function InvitationForm({
  eventId,
  invitation,
  readOnly,
  canDelete,
}: {
  eventId: string;
  invitation?: InvitationFormValues;
  readOnly?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"phone" | "duplicate" | "delete" | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [pending, setPending] = useState(false);
  const [ackPhone, setAckPhone] = useState(false);
  const [ackDup, setAckDup] = useState(false);

  const phone = invitation?.phone ?? "";
  const tel = telHref(invitation?.phone);
  const wa = whatsappHref(invitation?.phone);

  async function submit(form: HTMLFormElement) {
    setPending(true);
    setError(null);
    const formData = new FormData(form);
    if (ackPhone) formData.set("acknowledgeNoPhone", "true");
    if (ackDup) formData.set("acknowledgeDuplicate", "true");
    const result = await saveInvitationAction(eventId, invitation?.id ?? null, formData);
    setPending(false);
    if ("code" in result && result.code === "NO_PHONE") {
      setDialog("phone");
      return;
    }
    if ("code" in result && result.code === "DUPLICATE_PHONE") {
      setDuplicateName(result.existingName);
      setDialog("duplicate");
      return;
    }
    if (!result.ok) {
      setError("error" in result ? result.error : "שגיאה בשמירה");
      return;
    }
    router.push(`/events/${eventId}/invitations`);
    router.refresh();
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}
    >
      <section className="card grid gap-4 p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-bold">פרטים</h2>
        <label className="field md:col-span-2">
          <span>שם הזמנה / משפחה</span>
          <input className="input" name="householdName" defaultValue={invitation?.household_name ?? ""} required disabled={readOnly} />
        </label>
        <label className="field">
          <span>טלפון</span>
          <input className="input" name="phone" defaultValue={phone} disabled={readOnly} inputMode="tel" />
        </label>
        <label className="field">
          <span>צד מזמין</span>
          <select className="select" name="invitingSide" defaultValue={invitation?.inviting_side ?? "other"} disabled={readOnly}>
            {Object.entries(INVITING_SIDE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>מבוגרים</span>
          <input className="input" type="number" min={0} name="adults" defaultValue={invitation?.adults ?? 1} disabled={readOnly} />
        </label>
        <label className="field">
          <span>ילדים</span>
          <input className="input" type="number" min={0} name="children" defaultValue={invitation?.children ?? 0} disabled={readOnly} />
        </label>
        <label className="field">
          <span>קבוצה</span>
          <input className="input" name="groupName" defaultValue={invitation?.group_name ?? ""} disabled={readOnly} />
        </label>
      </section>

      <section className="card grid gap-4 p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-bold">סטטוס ומעקב</h2>
        <label className="field">
          <span>סטטוס</span>
          <select className="select" name="status" defaultValue={invitation?.status ?? "not_contacted"} disabled={readOnly}>
            {Object.entries(INVITATION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>תאריך מעקב הבא</span>
          <input className="input" type="date" name="followUpOn" defaultValue={invitation?.follow_up_on ?? ""} disabled={readOnly} />
        </label>
        <p className="md:col-span-2 text-sm text-[var(--ink-soft)]">
          יצירת קשר אחרון: {invitation?.last_contacted_at ? new Date(invitation.last_contacted_at).toLocaleString("he-IL") : "טרם עודכן"}
        </p>
      </section>

      <section className="card grid gap-4 p-4">
        <h2 className="text-lg font-bold">העדפות</h2>
        <label className="field">
          <span>רגישויות מזון</span>
          <textarea className="textarea" name="foodNotes" defaultValue={invitation?.food_notes ?? ""} disabled={readOnly} />
        </label>
        <label className="field">
          <span>נגישות</span>
          <textarea className="textarea" name="accessibilityNotes" defaultValue={invitation?.accessibility_notes ?? ""} disabled={readOnly} />
        </label>
        <label className="field">
          <span>הסעה / תחבורה</span>
          <textarea className="textarea" name="transportNotes" defaultValue={invitation?.transport_notes ?? ""} disabled={readOnly} />
        </label>
        <label className="field">
          <span>הערות</span>
          <textarea className="textarea" name="notes" defaultValue={invitation?.notes ?? ""} disabled={readOnly} />
        </label>
      </section>

      {error ? <p className="text-[var(--no)]">{error}</p> : null}

      <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 bg-[var(--paper)]/95 py-3 lg:bottom-0">
        {!readOnly ? (
          <button className="btn btn-primary" disabled={pending} type="submit">
            {pending ? "שומר…" : "שמירה"}
          </button>
        ) : null}
        {invitation?.id && !readOnly ? (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={async () => {
              await markContactedAction(eventId, invitation.id!);
              router.refresh();
            }}
          >
            סימון: פנינו
          </button>
        ) : null}
        {tel ? (
          <a className="btn btn-secondary" href={tel}>
            התקשר
          </a>
        ) : null}
        {wa ? (
          <a className="btn btn-secondary" href={wa} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        ) : null}
        {canDelete && invitation?.id ? (
          <button className="btn btn-danger" type="button" onClick={() => setDialog("delete")}>
            מחיקה
          </button>
        ) : null}
        <a className="btn btn-ghost" href={`/events/${eventId}/invitations`}>
          ביטול
        </a>
      </div>

      {dialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="card max-w-md p-5">
            {dialog === "phone" ? (
              <>
                <h3 className="text-lg font-bold">לא הוזן טלפון</h3>
                <p className="mt-2 text-[var(--ink-soft)]">
                  המעקב וההתקשרות יהיו מוגבלים. להמשיך?
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      setAckPhone(true);
                      setDialog(null);
                      const form = document.querySelector("form");
                      if (form) void submit(form as HTMLFormElement);
                    }}
                  >
                    להמשיך בלי טלפון
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setDialog(null)}>
                    ביטול
                  </button>
                </div>
              </>
            ) : null}
            {dialog === "duplicate" ? (
              <>
                <h3 className="text-lg font-bold">טלפון כפול באירוע</h3>
                <p className="mt-2 text-[var(--ink-soft)]">
                  כבר קיימת הזמנה עם אותו טלפון: {duplicateName}. אפשר להמשיך ולשמור בכל זאת.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      setAckDup(true);
                      setDialog(null);
                      const form = document.querySelector("form");
                      if (form) void submit(form as HTMLFormElement);
                    }}
                  >
                    שמירה בכל זאת
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setDialog(null)}>
                    ביטול
                  </button>
                </div>
              </>
            ) : null}
            {dialog === "delete" && invitation?.id ? (
              <>
                <h3 className="text-lg font-bold">העברה למחוקים</h3>
                <p className="mt-2 text-[var(--ink-soft)]">
                  ההזמנה תועבר למחוקים וניתן לשחזר אותה על ידי מנהל מערכת.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={async () => {
                      await softDeleteInvitationAction(eventId, invitation.id!);
                    }}
                  >
                    מחיקה
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setDialog(null)}>
                    ביטול
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}
