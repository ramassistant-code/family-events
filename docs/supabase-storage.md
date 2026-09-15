# Supabase Storage — event cover images

System admins upload a single cover image per event. Objects live in a public-read bucket; writes go through the Next.js server using the **service role** key (never the browser).

## Bucket

| | |
| --- | --- |
| Name | `event-covers` |
| Public | **Yes** (read). No public insert/update/delete. |
| Path | `{eventId}/{uuid}.{jpg\|png\|webp}` |
| MIME | `image/jpeg`, `image/png`, `image/webp` |
| Max size | 5 MB |

The app stores the public HTTPS URL in `events.cover_image_url`.

## Create the bucket (Dashboard)

1. Open the Supabase project (EU) → **Storage**.
2. **New bucket**: name `event-covers`, enable **Public bucket**.
3. File size limit: `5242880`. Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
4. Under **Policies**, allow public `SELECT` on this bucket. Do **not** add insert/update/delete policies for `anon` or `authenticated`. Uploads use the service role, which bypasses RLS.

## Create the bucket (SQL)

Run in the Supabase SQL editor:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-covers',
  'event-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read only. Service role bypasses RLS for upload/replace/delete.
drop policy if exists "Public read event covers" on storage.objects;
create policy "Public read event covers"
on storage.objects
for select
to public
using (bucket_id = 'event-covers');
```

Confirm there are **no** insert/update/delete policies on `storage.objects` for `event-covers` that grant `anon` or `authenticated`.

## Vercel / app environment

Set these on Vercel (Production + Preview) and in `.env.local`:

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + local | Project URL, e.g. `https://<ref>.supabase.co`. `SUPABASE_URL` is accepted as an alias. |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + local, **server only** | Settings → API → `service_role`. Never prefix with `NEXT_PUBLIC_`. |

The Postgres `DATABASE_URL` is separate (pooler). Storage uses the project URL + service role, not the database password.

After changing env vars, redeploy. Run `npm run db:migrate` so `events.cover_image_url` exists.

## Local without Storage

Event create/edit still works. Cover upload/remove returns a Hebrew error until the URL and service role key are set and the bucket exists.
