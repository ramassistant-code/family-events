# family-events

Hebrew RTL multi-event guest/RSVP app (Stage A MVP) for family events. The first seeded event is **חתונת מיטל ויונתן**.

Each invitation is a household, not a person. The UI is Hebrew and right-to-left. Commits and this README are in English.

## Stack

- Next.js App Router on Vercel
- PostgreSQL via `DATABASE_URL` (Supabase EU in production)
- Auth.js (NextAuth v5) Credentials — users and sessions live in **our** tables, not Supabase Auth
- Optional Docker Compose Postgres for a local demo
- Supabase Storage for event cover images (public-read bucket `event-covers`; uploads via service role)

## Seed accounts

After `npm run db:seed` (skipped if users already exist), three demo users are created:

- System admin
- Family member
- Event manager

Seed account emails and passwords are documented in Linear only (project Credentials doc). Do not put credentials in this repository. Set `SEED_ADMIN_PASSWORD` from that document before seeding.

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
AUTH_SECRET=generate-a-long-random-string
AUTH_URL=http://localhost:3000
DATABASE_URL=postgres://family:family@localhost:5432/family_events
# SEED_ADMIN_PASSWORD is required for seed — value from Linear Credentials, never commit it
# Optional, required to upload event covers:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase pooler URI (`sslmode=require`) or local Postgres |
| `AUTH_SECRET` | yes in production | `openssl rand -base64 32` |
| `AUTH_URL` | recommended | Public origin, e.g. `https://your-app.vercel.app` |
| `SEED_ADMIN_PASSWORD` | yes for seed | Stored in Linear Credentials. Never commit the value. |
| `NEXT_PUBLIC_SUPABASE_URL` | for cover uploads | Project URL (`https://<ref>.supabase.co`). `SUPABASE_URL` is an alias. |
| `SUPABASE_SERVICE_ROLE_KEY` | for cover uploads | Server only. Settings → API → `service_role`. Never expose to the client. |

SQL migrations are in `db/migrations/`. Auth.js tables `auth_accounts`, `auth_sessions`, and `auth_verification_tokens` are created there. Credentials auth uses JWT sessions (Auth.js requirement) while user records stay in `users`. Event cover images: see [docs/supabase-storage.md](docs/supabase-storage.md) (bucket `event-covers`, public read, no public write).

## Local run

```bash
docker compose up -d
cp .env.example .env.local
# set AUTH_SECRET and SEED_ADMIN_PASSWORD (from Linear Credentials) in .env.local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in with the admin seed user. A single assigned event skips the picker and opens the Hebrew dashboard.

```bash
npm run verify   # lint, typecheck, tests, production build
```

Sample import file: `examples/invitations-sample.csv`.

## Deploy (Vercel + Supabase EU)

1. Create a Supabase project in the **EU**. Use the connection pooler URI as `DATABASE_URL` (`sslmode=require`). Do not enable Supabase Auth for this app.
2. Create a Vercel project from this repository.
3. Set `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL` (the Vercel URL). To enable event cover uploads, also set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and create the `event-covers` Storage bucket (see [docs/supabase-storage.md](docs/supabase-storage.md)).
4. Run migrations and seed against production once:

   ```bash
   DATABASE_URL='postgres://...' npm run db:migrate
   # set SEED_ADMIN_PASSWORD from Linear Credentials (never commit it)
   DATABASE_URL='postgres://...' npm run db:seed
   ```

5. Deploy. Sign in, open **חתונת מיטל ויונתן**, and confirm RTL dashboard + invitation flows.

Production data is personal (names, phones). Complete DPAs with Vercel and Supabase before loading real guests. Database backups: 30 days on the provider; application logs: 14 days.

## Product rules implemented

- Roles: `system_admin`, `family_member`, `event_manager`
- Soft delete only in the UI; restore is admin-only; family members can soft-delete only rows they created
- Phone optional after a warning; duplicate phone in the same event warns and can continue
- Import Excel/CSV is create-only with preview, max 2000 rows, no upsert
- Export Excel excludes soft-deleted rows
- Invitation statuses: טרם פנינו · ממתינים לתשובה · מתלבטים · אישרו · סירבו
- Event statuses: טיוטה · פעיל · הסתיים · בוטל
- Inviting side: כלה · חתן · משותף · אחר
- Capacity counts adults+children 1:1; soft-deleted rows are excluded from capacity, dashboard, side split, export, and the active list
- Invitation status can be changed inline from the invitations list, or from the invitation form
- `last_contacted_at` updates on a status change to ממתינים לתשובה (`applyStatusChange`)
- `follow_up_on` stays empty until a contact action, then today+7 Asia/Jerusalem if empty; manual edit is allowed; today/overdue lists ignore empty dates and confirmed/declined rows
- `tel:` and WhatsApp links do not change status or dates
- Event manager: view + export + activity summary
- Family member: see/edit every invitation in assigned events
- Desktop sidebar, mobile bottom nav, full Hebrew RTL UI
- Event cover image: system admin upload/replace/remove (JPG/PNG/WebP, max 5MB); large on the dashboard, small elsewhere
