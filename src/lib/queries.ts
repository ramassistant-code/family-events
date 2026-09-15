import { getSql } from "./db";
import type {
  AppRole,
  EventStatus,
  EventType,
  InvitationStatus,
  InvitingSide,
  MembershipRole,
} from "./domain";
import { todayInJerusalem } from "./dates";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  is_system_admin: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type EventRow = {
  id: string;
  name: string;
  event_type: EventType;
  status: EventStatus;
  starts_at: Date | null;
  location: string | null;
  capacity: number;
  owners_text: string | null;
  cover_image_url: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
};

const EVENT_COLUMNS = `
  id, name, event_type, status, starts_at, location, capacity, owners_text,
  cover_image_url, created_by, updated_by, created_at, updated_at
`;

export type MembershipRow = {
  id: string;
  event_id: string;
  user_id: string;
  role: MembershipRole;
};

export type InvitationRow = {
  id: string;
  event_id: string;
  invite_key: string;
  household_name: string;
  phone: string | null;
  phone_normalized: string | null;
  inviting_side: InvitingSide;
  adults: number;
  children: number;
  status: InvitationStatus;
  follow_up_on: string | null;
  food_notes: string | null;
  accessibility_notes: string | null;
  transport_notes: string | null;
  notes: string | null;
  group_name: string | null;
  last_contacted_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  deleted_by: string | null;
  created_by_name?: string | null;
  deleted_by_name?: string | null;
};

export type ActivityRow = {
  id: string;
  event_id: string | null;
  invitation_id: string | null;
  actor_id: string | null;
  actor_name?: string | null;
  action: string;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: Date;
};

function invitationSelect(alias = "") {
  const a = alias ? `${alias}.` : "";
  return `
    ${a}id, ${a}event_id, ${a}invite_key, ${a}household_name, ${a}phone, ${a}phone_normalized,
    ${a}inviting_side, ${a}adults, ${a}children, ${a}status,
    to_char(${a}follow_up_on, 'YYYY-MM-DD') as follow_up_on,
    ${a}food_notes, ${a}accessibility_notes, ${a}transport_notes, ${a}notes, ${a}group_name,
    ${a}last_contacted_at, ${a}created_by, ${a}updated_by, ${a}created_at, ${a}updated_at,
    ${a}deleted_at, ${a}deleted_by
  `;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const sql = getSql();
  const rows = await sql<UserRow[]>`
    SELECT id, email, name, password_hash, is_system_admin, is_active, created_at, updated_at
    FROM users
    WHERE lower(email) = ${email.toLowerCase()}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const sql = getSql();
  const rows = await sql<UserRow[]>`
    SELECT id, email, name, password_hash, is_system_admin, is_active, created_at, updated_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listUsers(): Promise<UserRow[]> {
  const sql = getSql();
  return sql<UserRow[]>`
    SELECT id, email, name, password_hash, is_system_admin, is_active, created_at, updated_at
    FROM users
    ORDER BY created_at ASC
  `;
}

export async function listMembershipsForUser(userId: string): Promise<(MembershipRow & { event_name: string })[]> {
  const sql = getSql();
  return sql<(MembershipRow & { event_name: string })[]>`
    SELECT m.id, m.event_id, m.user_id, m.role, e.name as event_name
    FROM event_memberships m
    JOIN events e ON e.id = m.event_id
    WHERE m.user_id = ${userId}
    ORDER BY e.starts_at NULLS LAST, e.name
  `;
}

export async function listMembershipsForEvent(eventId: string) {
  const sql = getSql();
  return sql<(MembershipRow & { user_name: string; user_email: string })[]>`
    SELECT m.id, m.event_id, m.user_id, m.role, u.name as user_name, u.email as user_email
    FROM event_memberships m
    JOIN users u ON u.id = m.user_id
    WHERE m.event_id = ${eventId}
    ORDER BY u.name
  `;
}

export async function getMembership(eventId: string, userId: string): Promise<MembershipRow | null> {
  const sql = getSql();
  const rows = await sql<MembershipRow[]>`
    SELECT id, event_id, user_id, role
    FROM event_memberships
    WHERE event_id = ${eventId} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function accessibleEvents(userId: string, isSystemAdmin: boolean): Promise<(EventRow & { role: AppRole })[]> {
  const sql = getSql();
  if (isSystemAdmin) {
    const events = await sql<EventRow[]>`
      SELECT ${sql.unsafe(EVENT_COLUMNS)}
      FROM events
      ORDER BY starts_at NULLS LAST, name
    `;
    return events.map((event) => ({ ...event, role: "system_admin" as const }));
  }
  return sql<(EventRow & { role: AppRole })[]>`
    SELECT e.id, e.name, e.event_type, e.status, e.starts_at, e.location, e.capacity, e.owners_text,
           e.cover_image_url, e.created_by, e.updated_by, e.created_at, e.updated_at, m.role
    FROM events e
    JOIN event_memberships m ON m.event_id = e.id
    WHERE m.user_id = ${userId}
    ORDER BY e.starts_at NULLS LAST, e.name
  `;
}

export async function getEvent(eventId: string): Promise<EventRow | null> {
  const sql = getSql();
  const rows = await sql<EventRow[]>`
    SELECT ${sql.unsafe(EVENT_COLUMNS)}
    FROM events
    WHERE id = ${eventId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listEvents(): Promise<EventRow[]> {
  const sql = getSql();
  return sql<EventRow[]>`
    SELECT ${sql.unsafe(EVENT_COLUMNS)}
    FROM events
    ORDER BY starts_at NULLS LAST, name
  `;
}

export type InvitationFilters = {
  query?: string;
  status?: InvitationStatus | "";
  side?: InvitingSide | "";
  followUp?: "today" | "overdue" | "";
  group?: string;
  createdBy?: string;
  sort?: "name" | "status" | "follow_up" | "last_contacted" | "created";
};

export async function listInvitationGroupNames(eventId: string): Promise<string[]> {
  const sql = getSql();
  const rows = await sql<{ group_name: string }[]>`
    SELECT DISTINCT group_name
    FROM invitations
    WHERE event_id = ${eventId}
      AND deleted_at IS NULL
      AND group_name IS NOT NULL
      AND btrim(group_name) <> ''
    ORDER BY group_name
  `;
  return rows.map((row) => row.group_name);
}

export async function listInvitations(
  eventId: string,
  filters: InvitationFilters = {},
  includeDeleted = false,
): Promise<InvitationRow[]> {
  const sql = getSql();
  const today = todayInJerusalem();
  const query = filters.query?.trim() ?? "";
  const like = query ? `%${query}%` : null;

  return sql<InvitationRow[]>`
    SELECT ${sql.unsafe(invitationSelect("i"))},
           cu.name as created_by_name
    FROM invitations i
    LEFT JOIN users cu ON cu.id = i.created_by
    WHERE i.event_id = ${eventId}
      ${includeDeleted ? sql`AND i.deleted_at IS NOT NULL` : sql`AND i.deleted_at IS NULL`}
      ${filters.status ? sql`AND i.status = ${filters.status}` : sql``}
      ${filters.side ? sql`AND i.inviting_side = ${filters.side}` : sql``}
      ${filters.createdBy ? sql`AND i.created_by = ${filters.createdBy}` : sql``}
      ${filters.group ? sql`AND i.group_name = ${filters.group}` : sql``}
      ${
        like
          ? sql`AND (
              i.household_name ILIKE ${like}
              OR coalesce(i.phone, '') ILIKE ${like}
              OR coalesce(i.phone_normalized, '') ILIKE ${like}
              OR coalesce(i.group_name, '') ILIKE ${like}
            )`
          : sql``
      }
      ${
        filters.followUp === "today"
          ? sql`AND i.follow_up_on = ${today}::date
                AND i.status NOT IN ('confirmed', 'declined')`
          : sql``
      }
      ${
        filters.followUp === "overdue"
          ? sql`AND i.follow_up_on < ${today}::date
                AND i.status NOT IN ('confirmed', 'declined')`
          : sql``
      }
    ORDER BY
      ${
        filters.sort === "status"
          ? sql`i.status, i.household_name`
          : filters.sort === "follow_up"
            ? sql`i.follow_up_on NULLS LAST, i.household_name`
            : filters.sort === "last_contacted"
              ? sql`i.last_contacted_at DESC NULLS LAST, i.household_name`
              : filters.sort === "created"
                ? sql`i.created_at DESC`
                : sql`i.household_name`
      }
  `;
}

export async function listFollowUps(
  eventId: string,
  bucket: "today" | "overdue",
  limit = 8,
): Promise<InvitationRow[]> {
  return listInvitations(eventId, { followUp: bucket, sort: "follow_up" }).then((rows) =>
    rows.slice(0, limit),
  );
}

export async function getInvitation(eventId: string, invitationId: string): Promise<InvitationRow | null> {
  const sql = getSql();
  const rows = await sql<InvitationRow[]>`
    SELECT ${sql.unsafe(invitationSelect("i"))},
           cu.name as created_by_name
    FROM invitations i
    LEFT JOIN users cu ON cu.id = i.created_by
    WHERE i.event_id = ${eventId} AND i.id = ${invitationId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findDuplicatePhone(
  eventId: string,
  phoneNormalized: string,
  excludeId?: string,
): Promise<InvitationRow | null> {
  const sql = getSql();
  const rows = await sql<InvitationRow[]>`
    SELECT ${sql.unsafe(invitationSelect("i"))}
    FROM invitations i
    WHERE i.event_id = ${eventId}
      AND i.deleted_at IS NULL
      AND i.phone_normalized = ${phoneNormalized}
      ${excludeId ? sql`AND i.id <> ${excludeId}` : sql``}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listActiveNormalizedPhones(eventId: string): Promise<string[]> {
  const sql = getSql();
  const rows = await sql<{ phone_normalized: string }[]>`
    SELECT DISTINCT phone_normalized
    FROM invitations
    WHERE event_id = ${eventId}
      AND deleted_at IS NULL
      AND phone_normalized IS NOT NULL
  `;
  return rows.map((row) => row.phone_normalized);
}

export async function insertInvitation(values: {
  eventId: string;
  householdName: string;
  phone: string | null;
  phoneNormalized: string | null;
  invitingSide: InvitingSide;
  adults: number;
  children: number;
  status: InvitationStatus;
  followUpOn: string | null;
  foodNotes: string | null;
  accessibilityNotes: string | null;
  transportNotes: string | null;
  notes: string | null;
  groupName: string | null;
  createdBy: string;
}): Promise<InvitationRow> {
  const sql = getSql();
  const rows = await sql<InvitationRow[]>`
    INSERT INTO invitations (
      event_id, household_name, phone, phone_normalized, inviting_side,
      adults, children, status, follow_up_on, food_notes, accessibility_notes,
      transport_notes, notes, group_name, created_by, updated_by
    ) VALUES (
      ${values.eventId}, ${values.householdName}, ${values.phone}, ${values.phoneNormalized},
      ${values.invitingSide}, ${values.adults}, ${values.children}, ${values.status},
      ${values.followUpOn}, ${values.foodNotes}, ${values.accessibilityNotes},
      ${values.transportNotes}, ${values.notes}, ${values.groupName},
      ${values.createdBy}, ${values.createdBy}
    )
    RETURNING ${sql.unsafe(invitationSelect())}
  `;
  return rows[0];
}

export async function updateInvitation(values: {
  id: string;
  eventId: string;
  householdName: string;
  phone: string | null;
  phoneNormalized: string | null;
  invitingSide: InvitingSide;
  adults: number;
  children: number;
  status: InvitationStatus;
  followUpOn: string | null;
  foodNotes: string | null;
  accessibilityNotes: string | null;
  transportNotes: string | null;
  notes: string | null;
  groupName: string | null;
  lastContactedAt?: Date | null;
  updatedBy: string;
}): Promise<InvitationRow> {
  const sql = getSql();
  const rows = await sql<InvitationRow[]>`
    UPDATE invitations SET
      household_name = ${values.householdName},
      phone = ${values.phone},
      phone_normalized = ${values.phoneNormalized},
      inviting_side = ${values.invitingSide},
      adults = ${values.adults},
      children = ${values.children},
      status = ${values.status},
      follow_up_on = ${values.followUpOn},
      food_notes = ${values.foodNotes},
      accessibility_notes = ${values.accessibilityNotes},
      transport_notes = ${values.transportNotes},
      notes = ${values.notes},
      group_name = ${values.groupName},
      updated_by = ${values.updatedBy},
      updated_at = now(),
      last_contacted_at = ${
        values.lastContactedAt === undefined
          ? sql`last_contacted_at`
          : sql`${values.lastContactedAt}`
      }
    WHERE id = ${values.id} AND event_id = ${values.eventId}
    RETURNING ${sql.unsafe(invitationSelect())}
  `;
  return rows[0];
}

export async function softDeleteInvitation(
  eventId: string,
  invitationId: string,
  actorId: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE invitations
    SET deleted_at = now(), deleted_by = ${actorId}, updated_by = ${actorId}, updated_at = now()
    WHERE id = ${invitationId} AND event_id = ${eventId} AND deleted_at IS NULL
  `;
}

export async function updateInvitationGroupNames(
  eventId: string,
  invitationIds: string[],
  groupName: string | null,
  actorId: string,
): Promise<InvitationRow[]> {
  if (invitationIds.length === 0) return [];
  const sql = getSql();
  return sql<InvitationRow[]>`
    UPDATE invitations
    SET group_name = ${groupName}, updated_by = ${actorId}, updated_at = now()
    WHERE event_id = ${eventId}
      AND deleted_at IS NULL
      AND id = ANY(${invitationIds}::uuid[])
    RETURNING ${sql.unsafe(invitationSelect())}
  `;
}

export async function softDeleteInvitations(
  eventId: string,
  invitationIds: string[],
  actorId: string,
): Promise<InvitationRow[]> {
  if (invitationIds.length === 0) return [];
  const sql = getSql();
  return sql<InvitationRow[]>`
    UPDATE invitations
    SET deleted_at = now(), deleted_by = ${actorId}, updated_by = ${actorId}, updated_at = now()
    WHERE event_id = ${eventId}
      AND deleted_at IS NULL
      AND id = ANY(${invitationIds}::uuid[])
    RETURNING ${sql.unsafe(invitationSelect())}
  `;
}

export async function restoreInvitation(invitationId: string, actorId: string): Promise<InvitationRow | null> {
  const sql = getSql();
  const rows = await sql<InvitationRow[]>`
    UPDATE invitations
    SET deleted_at = NULL, deleted_by = NULL, updated_by = ${actorId}, updated_at = now()
    WHERE id = ${invitationId} AND deleted_at IS NOT NULL
    RETURNING ${sql.unsafe(invitationSelect())}
  `;
  return rows[0] ?? null;
}

export async function listTrash(eventId?: string): Promise<InvitationRow[]> {
  const sql = getSql();
  return sql<InvitationRow[]>`
    SELECT ${sql.unsafe(invitationSelect("i"))},
           du.name as deleted_by_name
    FROM invitations i
    LEFT JOIN users du ON du.id = i.deleted_by
    WHERE i.deleted_at IS NOT NULL
      ${eventId ? sql`AND i.event_id = ${eventId}` : sql``}
    ORDER BY i.deleted_at DESC
  `;
}

export async function insertActivity(values: {
  eventId: string | null;
  invitationId?: string | null;
  actorId: string;
  action: string;
  summary: string;
  details?: Record<string, unknown>;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO activity_log (event_id, invitation_id, actor_id, action, summary, details)
    VALUES (
      ${values.eventId},
      ${values.invitationId ?? null},
      ${values.actorId},
      ${values.action},
      ${values.summary},
      ${values.details ? sql.json(JSON.parse(JSON.stringify(values.details))) : null}
    )
  `;
}

export async function listActivity(eventId: string, limit = 200): Promise<ActivityRow[]> {
  const sql = getSql();
  return sql<ActivityRow[]>`
    SELECT a.id, a.event_id, a.invitation_id, a.actor_id, u.name as actor_name,
           a.action, a.summary, a.details, a.created_at
    FROM activity_log a
    LEFT JOIN users u ON u.id = a.actor_id
    WHERE a.event_id = ${eventId}
    ORDER BY a.created_at DESC
    LIMIT ${limit}
  `;
}

export async function insertEvent(values: {
  name: string;
  eventType: EventType;
  status: EventStatus;
  startsAt: string | null;
  location: string | null;
  capacity: number;
  ownersText: string | null;
  actorId: string;
}): Promise<EventRow> {
  const sql = getSql();
  const rows = await sql<EventRow[]>`
    INSERT INTO events (
      name, event_type, status, starts_at, location, capacity, owners_text, created_by, updated_by
    ) VALUES (
      ${values.name}, ${values.eventType}, ${values.status},
      ${values.startsAt}, ${values.location}, ${values.capacity}, ${values.ownersText},
      ${values.actorId}, ${values.actorId}
    )
    RETURNING ${sql.unsafe(EVENT_COLUMNS)}
  `;
  return rows[0];
}

export async function updateEvent(values: {
  id: string;
  name: string;
  eventType: EventType;
  status: EventStatus;
  startsAt: string | null;
  location: string | null;
  capacity: number;
  ownersText: string | null;
  actorId: string;
}): Promise<EventRow> {
  const sql = getSql();
  const rows = await sql<EventRow[]>`
    UPDATE events SET
      name = ${values.name},
      event_type = ${values.eventType},
      status = ${values.status},
      starts_at = ${values.startsAt},
      location = ${values.location},
      capacity = ${values.capacity},
      owners_text = ${values.ownersText},
      updated_by = ${values.actorId},
      updated_at = now()
    WHERE id = ${values.id}
    RETURNING ${sql.unsafe(EVENT_COLUMNS)}
  `;
  return rows[0];
}

export async function updateEventCoverImage(
  eventId: string,
  coverImageUrl: string | null,
  actorId: string,
): Promise<EventRow | null> {
  const sql = getSql();
  const rows = await sql<EventRow[]>`
    UPDATE events SET
      cover_image_url = ${coverImageUrl},
      updated_by = ${actorId},
      updated_at = now()
    WHERE id = ${eventId}
    RETURNING ${sql.unsafe(EVENT_COLUMNS)}
  `;
  return rows[0] ?? null;
}

export async function insertUser(values: {
  email: string;
  name: string;
  passwordHash: string;
  isSystemAdmin: boolean;
  isActive: boolean;
}): Promise<UserRow> {
  const sql = getSql();
  const rows = await sql<UserRow[]>`
    INSERT INTO users (email, name, password_hash, is_system_admin, is_active)
    VALUES (${values.email.toLowerCase()}, ${values.name}, ${values.passwordHash}, ${values.isSystemAdmin}, ${values.isActive})
    RETURNING id, email, name, password_hash, is_system_admin, is_active, created_at, updated_at
  `;
  return rows[0];
}

export async function updateUser(values: {
  id: string;
  name: string;
  isSystemAdmin: boolean;
  isActive: boolean;
  passwordHash?: string;
}): Promise<UserRow> {
  const sql = getSql();
  const rows = await sql<UserRow[]>`
    UPDATE users SET
      name = ${values.name},
      is_system_admin = ${values.isSystemAdmin},
      is_active = ${values.isActive},
      password_hash = ${values.passwordHash ? sql`${values.passwordHash}` : sql`password_hash`},
      updated_at = now()
    WHERE id = ${values.id}
    RETURNING id, email, name, password_hash, is_system_admin, is_active, created_at, updated_at
  `;
  return rows[0];
}

export async function replaceMemberships(userId: string, memberships: { eventId: string; role: MembershipRole }[]) {
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM event_memberships WHERE user_id = ${userId}`;
    for (const membership of memberships) {
      await tx`
        INSERT INTO event_memberships (event_id, user_id, role)
        VALUES (${membership.eventId}, ${userId}, ${membership.role})
      `;
    }
  });
}
