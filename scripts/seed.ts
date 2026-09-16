import { config } from "dotenv";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { normalizePhone } from "../src/lib/phone";
import { addDaysToDateString, todayInJerusalem } from "../src/lib/dates";

config({ path: ".env.local" });
config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const connectionUrl: string = DATABASE_URL;

const password = process.env.SEED_ADMIN_PASSWORD?.trim() ?? "";
if (!password) {
  console.error(
    "SEED_ADMIN_PASSWORD is required for seed. Set it from the Linear Credentials document. Do not commit the value.",
  );
  process.exit(1);
}

async function main() {
  const sql = postgres(connectionUrl, { max: 1, prepare: false });
  try {
    const existing = await sql<{ count: number }[]>`SELECT count(*)::int as count FROM users`;
    if (existing[0]?.count > 0) {
      console.log("seed skipped — users already exist");
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const today = todayInJerusalem();

    const [admin] = await sql<{ id: string }[]>`
      INSERT INTO users (email, name, password_hash, is_system_admin, is_active)
      VALUES ('admin@family-events.local', 'מנהל מערכת', ${hash}, true, true)
      RETURNING id
    `;
    const [family] = await sql<{ id: string }[]>`
      INSERT INTO users (email, name, password_hash, is_system_admin, is_active)
      VALUES ('family@family-events.local', 'בן משפחה', ${hash}, false, true)
      RETURNING id
    `;
    const [manager] = await sql<{ id: string }[]>`
      INSERT INTO users (email, name, password_hash, is_system_admin, is_active)
      VALUES ('manager@family-events.local', 'מנהל אירוע', ${hash}, false, true)
      RETURNING id
    `;

    const [event] = await sql<{ id: string }[]>`
      INSERT INTO events (name, event_type, status, starts_at, location, capacity, owners_text, created_by, updated_by)
      VALUES (
        'חתונת מיטל ויונתן',
        'wedding',
        'active',
        '2026-10-20T16:00:00+03:00',
        'אולם אירועים, תל אביב',
        280,
        'מיטל ויונתן',
        ${admin.id},
        ${admin.id}
      )
      RETURNING id
    `;

    await sql`
      INSERT INTO event_memberships (event_id, user_id, role)
      VALUES
        (${event.id}, ${family.id}, 'family_member'),
        (${event.id}, ${manager.id}, 'event_manager')
    `;

    const samples = [
      {
        name: "משפחת כהן",
        phone: "0501234567",
        side: "bride",
        adults: 2,
        children: 2,
        status: "confirmed",
        follow: addDaysToDateString(today, 10),
        last: true,
        food: "כשר למהדרין",
        access: null,
        transport: "מגיעים ברכב",
        notes: "שולחן משפחה",
        group: "משפחה",
        deleted: false,
        creator: family.id,
      },
      {
        name: "משפחת לוי",
        phone: "0527654321",
        side: "groom",
        adults: 2,
        children: 1,
        status: "awaiting",
        follow: today,
        last: true,
        food: null,
        access: null,
        transport: null,
        notes: "לחזור אחרי החג",
        group: "חברים",
        deleted: false,
        creator: family.id,
      },
      {
        name: "משפחת מזרחי",
        phone: "0541112233",
        side: "shared",
        adults: 3,
        children: 0,
        status: "considering",
        follow: addDaysToDateString(today, -3),
        last: true,
        food: "אלרגיה לגלuten",
        access: "כיסא גלגלים",
        transport: "נדרשת הסעה",
        notes: null,
        group: "עבודה",
        deleted: false,
        creator: admin.id,
      },
      {
        name: "משפחת אברהם",
        phone: null,
        side: "other",
        adults: 2,
        children: 0,
        status: "not_contacted",
        follow: null,
        last: false,
        food: null,
        access: null,
        transport: null,
        notes: "אין טלפון לפי בקשתם",
        group: null,
        deleted: false,
        creator: family.id,
      },
      {
        name: "משפחת דוד",
        phone: "0539998877",
        side: "bride",
        adults: 1,
        children: 0,
        status: "declined",
        follow: addDaysToDateString(today, -10),
        last: true,
        food: null,
        access: null,
        transport: null,
        notes: "לא יוכלו להגיע",
        group: "משפחה",
        deleted: false,
        creator: admin.id,
      },
      {
        name: "משפחת יצחק",
        phone: "0508887766",
        side: "groom",
        adults: 2,
        children: 3,
        status: "awaiting",
        follow: addDaysToDateString(today, 5),
        last: true,
        food: "צמחוני",
        access: null,
        transport: null,
        notes: null,
        group: "חברים",
        deleted: false,
        creator: family.id,
      },
      {
        name: "משפחת שמשון",
        phone: "0502223344",
        side: "bride",
        adults: 4,
        children: 2,
        status: "confirmed",
        follow: null,
        last: false,
        food: null,
        access: null,
        transport: null,
        notes: "נמחקה לבדיקת חישוב קיבולת",
        group: null,
        deleted: true,
        creator: family.id,
      },
    ];

    for (const sample of samples) {
      const normalized = normalizePhone(sample.phone);
      await sql`
        INSERT INTO invitations (
          event_id, household_name, phone, phone_normalized, inviting_side,
          adults, children, status, follow_up_on, food_notes, accessibility_notes,
          transport_notes, notes, group_name, last_contacted_at, created_by, updated_by,
          deleted_at, deleted_by
        ) VALUES (
          ${event.id},
          ${sample.name},
          ${sample.phone},
          ${normalized},
          ${sample.side},
          ${sample.adults},
          ${sample.children},
          ${sample.status},
          ${sample.follow},
          ${sample.food},
          ${sample.access},
          ${sample.transport},
          ${sample.notes},
          ${sample.group},
          ${sample.last ? new Date() : null},
          ${sample.creator},
          ${sample.creator},
          ${sample.deleted ? new Date() : null},
          ${sample.deleted ? admin.id : null}
        )
      `;
    }

    await sql`
      INSERT INTO activity_log (event_id, actor_id, action, summary)
      VALUES (
        ${event.id},
        ${admin.id},
        'event.created',
        'נוצר אירוע «חתונת מיטל ויונתן»'
      )
    `;

    console.log("seed complete");
    console.log("  admin@family-events.local (system_admin)");
    console.log("  family@family-events.local (family_member)");
    console.log("  manager@family-events.local (event_manager)");
    console.log("Passwords are documented in Linear Credentials only.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
