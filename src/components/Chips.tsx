import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  INVITATION_STATUS_LABELS,
  INVITING_SIDE_LABELS,
  ROLE_LABELS,
  type AppRole,
  type EventStatus,
  type EventType,
  type InvitationStatus,
  type InvitingSide,
} from "@/lib/domain";

export function InvitationStatusChip({ status }: { status: InvitationStatus }) {
  return <span className={`chip chip-${status}`}>{INVITATION_STATUS_LABELS[status]}</span>;
}

export function EventStatusChip({ status }: { status: EventStatus }) {
  return <span className={`chip chip-${status}`}>{EVENT_STATUS_LABELS[status]}</span>;
}

export function SideChip({ side }: { side: InvitingSide }) {
  return <span className="chip chip-not_contacted">{INVITING_SIDE_LABELS[side]}</span>;
}

export function RoleChip({ role }: { role: AppRole }) {
  return <span className="chip chip-awaiting">{ROLE_LABELS[role]}</span>;
}

export function EventTypeLabel({ type }: { type: EventType }) {
  return <>{EVENT_TYPE_LABELS[type]}</>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card grid place-items-center gap-2 px-6 py-12 text-center">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="text-[var(--ink-soft)]">{body}</p>
      {action}
    </div>
  );
}
