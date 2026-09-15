-- Event cover image: public HTTPS URL to a Supabase Storage object.

ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_image_url text;
