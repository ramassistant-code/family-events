import type { InvitationStatus } from "./domain";
import { addDaysToDateString } from "./dates";

export type FollowUpBucket = "today" | "overdue" | null;

export function classifyFollowUp(
  followUpOn: string | null | undefined,
  status: InvitationStatus,
  today: string,
): FollowUpBucket {
  if (!followUpOn) return null;
  if (status === "confirmed" || status === "declined") return null;
  if (followUpOn === today) return "today";
  if (followUpOn < today) return "overdue";
  return null;
}

export function shouldFillFollowUp(followUpOn: string | null | undefined): boolean {
  return !followUpOn;
}

export function followUpAfterContact(followUpOn: string | null | undefined, today: string): string {
  return followUpOn || addDaysToDateString(today, 7);
}

export function applyMarkContacted(input: {
  status: InvitationStatus;
  followUpOn: string | null | undefined;
  today: string;
}): {
  status: InvitationStatus;
  followUpOn: string;
  touchLastContacted: true;
} {
  return {
    status: input.status === "not_contacted" ? "awaiting" : input.status,
    followUpOn: followUpAfterContact(input.followUpOn, input.today),
    touchLastContacted: true,
  };
}

export function applyStatusChange(input: {
  previousStatus: InvitationStatus;
  nextStatus: InvitationStatus;
  followUpOn: string | null | undefined;
  today: string;
}): {
  followUpOn: string | null;
  touchLastContacted: boolean;
} {
  const movedToAwaiting = input.nextStatus === "awaiting" && input.previousStatus !== "awaiting";
  if (movedToAwaiting) {
    return {
      followUpOn: followUpAfterContact(input.followUpOn, input.today),
      touchLastContacted: true,
    };
  }
  return {
    followUpOn: input.followUpOn ?? null,
    touchLastContacted: false,
  };
}
