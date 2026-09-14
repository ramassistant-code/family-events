-- Stage A schema: users, events, memberships, invitations, activity, Auth.js tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  is_system_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('wedding', 'bar_bat_mitzvah', 'other')),
  status text NOT NULL CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
  starts_at timestamptz,
  location text,
  capacity integer NOT NULL CHECK (capacity > 0),
  owners_text text,
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('family_member', 'event_manager')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  invite_key uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  household_name text NOT NULL,
  phone text,
  phone_normalized text,
  inviting_side text NOT NULL CHECK (inviting_side IN ('bride', 'groom', 'shared', 'other')),
  adults integer NOT NULL DEFAULT 1 CHECK (adults >= 0),
  children integer NOT NULL DEFAULT 0 CHECK (children >= 0),
  status text NOT NULL DEFAULT 'not_contacted'
    CHECK (status IN ('not_contacted', 'awaiting', 'considering', 'confirmed', 'declined')),
  follow_up_on date,
  food_notes text,
  accessibility_notes text,
  transport_notes text,
  notes text,
  group_name text,
  last_contacted_at timestamptz,
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_invitations_event_active
  ON invitations (event_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_invitations_event_phone
  ON invitations (event_id, phone_normalized)
  WHERE phone_normalized IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_invitations_follow_up
  ON invitations (event_id, follow_up_on)
  WHERE deleted_at IS NULL AND follow_up_on IS NOT NULL;

CREATE INDEX idx_invitations_deleted
  ON invitations (event_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events (id) ON DELETE CASCADE,
  invitation_id uuid REFERENCES invitations (id) ON DELETE SET NULL,
  actor_id uuid REFERENCES users (id) ON DELETE SET NULL,
  action text NOT NULL,
  summary text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_event_created
  ON activity_log (event_id, created_at DESC);

-- Auth.js tables (users/sessions live in our database, not Supabase Auth).
CREATE TABLE auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE auth_sessions (
  session_token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);

CREATE INDEX idx_auth_sessions_user ON auth_sessions (user_id);

CREATE TABLE auth_verification_tokens (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);
