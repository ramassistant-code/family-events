import { isInvitationStatus, isInvitingSide } from "./domain";
import type { InvitationFilters } from "./queries";

export type ListedInvitationFilterInput = {
  query?: string;
  q?: string;
  status?: string;
  side?: string;
  followUp?: string;
  group?: string;
};

/** Same list filters as `/events/[eventId]/invitations` and `listInvitations`. */
export function parseListedInvitationFilters(input: ListedInvitationFilterInput): InvitationFilters {
  const query = (input.query ?? input.q ?? "").trim();
  const statusRaw = input.status ?? "";
  const sideRaw = input.side ?? "";
  const followUpRaw = input.followUp ?? "";
  const group = (input.group ?? "").trim();

  return {
    query,
    status: isInvitationStatus(statusRaw) ? statusRaw : "",
    side: isInvitingSide(sideRaw) ? sideRaw : "",
    followUp: followUpRaw === "today" || followUpRaw === "overdue" ? followUpRaw : "",
    group,
  };
}
