import type { InvitationStatus, InvitingSide } from "./domain";

export type CapacityInvitation = {
  status: InvitationStatus;
  invitingSide: InvitingSide;
  adults: number;
  children: number;
  deleted?: boolean;
};

export type StatusCounts = Record<InvitationStatus, { invites: number; guests: number }>;

export type SideSplit = Record<
  InvitingSide,
  { invites: number; guests: number; confirmedGuests: number }
>;

function emptyStatusCounts(): StatusCounts {
  return {
    not_contacted: { invites: 0, guests: 0 },
    awaiting: { invites: 0, guests: 0 },
    considering: { invites: 0, guests: 0 },
    confirmed: { invites: 0, guests: 0 },
    declined: { invites: 0, guests: 0 },
  };
}

function emptySideSplit(): SideSplit {
  return {
    bride: { invites: 0, guests: 0, confirmedGuests: 0 },
    groom: { invites: 0, guests: 0, confirmedGuests: 0 },
    shared: { invites: 0, guests: 0, confirmedGuests: 0 },
    other: { invites: 0, guests: 0, confirmedGuests: 0 },
  };
}

export function summarizeCapacity(invitations: CapacityInvitation[], capacity: number) {
  const active = invitations.filter((row) => !row.deleted);
  const byStatus = emptyStatusCounts();
  const bySide = emptySideSplit();
  let totalGuests = 0;
  let confirmedGuests = 0;

  for (const row of active) {
    const guests = row.adults + row.children;
    totalGuests += guests;
    byStatus[row.status].invites += 1;
    byStatus[row.status].guests += guests;
    bySide[row.invitingSide].invites += 1;
    bySide[row.invitingSide].guests += guests;
    if (row.status === "confirmed") {
      confirmedGuests += guests;
      bySide[row.invitingSide].confirmedGuests += guests;
    }
  }

  return {
    activeInvites: active.length,
    totalGuests,
    confirmedGuests,
    capacity,
    progress: capacity > 0 ? confirmedGuests / capacity : 0,
    overflow: confirmedGuests > capacity,
    byStatus,
    bySide,
  };
}
