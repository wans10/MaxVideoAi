-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Pricing Rules
CREATE TABLE IF NOT EXISTS app_pricing_rules (
  id TEXT PRIMARY KEY,
  engine_id TEXT,
  resolution TEXT,
  margin_percent NUMERIC DEFAULT 0,
  margin_flat_cents INTEGER DEFAULT 0,
  surcharge_audio_percent NUMERIC DEFAULT 0,
  surcharge_upscale_percent NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  vendor_account_id TEXT,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Engine Settings
CREATE TABLE IF NOT EXISTS engine_settings (
  engine_id TEXT PRIMARY KEY,
  options JSONB,
  pricing JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS engine_settings_updated_idx ON engine_settings (updated_at DESC);

-- Default Pricing Rule
INSERT INTO app_pricing_rules (
  id, margin_percent, margin_flat_cents, surcharge_audio_percent,
  surcharge_upscale_percent, currency, effective_from, created_at
)
VALUES ('default', 0.2, 0, 0.2, 0.5, 'USD', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Membership Tiers
CREATE TABLE IF NOT EXISTS app_membership_tiers (
  tier TEXT PRIMARY KEY,
  spend_threshold_cents BIGINT NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

INSERT INTO app_membership_tiers (tier, spend_threshold_cents, discount_percent)
VALUES
  ('member', 0, 0),
  ('plus', 5000, 0.05),
  ('pro', 20000, 0.1)
ON CONFLICT (tier) DO NOTHING;

-- App Jobs
CREATE TABLE IF NOT EXISTS app_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE,
  user_id TEXT,
  engine_id TEXT NOT NULL,
  engine_label TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  video_url TEXT,
  aspect_ratio TEXT,
  has_audio BOOLEAN DEFAULT FALSE,
  can_upscale BOOLEAN DEFAULT FALSE,
  preview_frame TEXT,
  batch_id TEXT,
  group_id TEXT,
  iteration_index INTEGER,
  iteration_count INTEGER,
  render_ids JSONB,
  hero_render_id TEXT,
  local_key TEXT,
  message TEXT,
  eta_seconds INTEGER,
  eta_label TEXT,
  provider_job_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  final_price_cents INTEGER,
  pricing_snapshot JSONB,
  cost_breakdown_usd JSONB,
  settings_snapshot JSONB,
  currency TEXT DEFAULT 'USD',
  vendor_account_id TEXT,
  payment_status TEXT DEFAULT 'platform',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hidden BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'public',
  indexable BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  featured_order INTEGER DEFAULT 0,
  legacy_migrated BOOLEAN DEFAULT FALSE,
  provisional BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS app_jobs_created_idx ON app_jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS app_jobs_visibility_idx ON app_jobs (visibility, indexable);

-- App Receipts
CREATE TABLE IF NOT EXISTS app_receipts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup','charge','refund','discount','tax')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  metadata JSONB,
  job_id TEXT,
  pricing_snapshot JSONB,
  application_fee_cents INTEGER DEFAULT 0,
  vendor_account_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  original_amount_cents INTEGER,
  original_currency TEXT,
  fx_rate NUMERIC,
  fx_margin_bps INTEGER,
  fx_rate_timestamp TIMESTAMPTZ,
  platform_revenue_cents BIGINT,
  destination_acct TEXT
);
CREATE INDEX IF NOT EXISTS app_receipts_user_created_idx ON app_receipts (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS app_receipts_unique_pi ON app_receipts (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_receipts_unique_charge ON app_receipts (stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_receipts_unique_refund_job ON app_receipts (job_id) WHERE job_id IS NOT NULL AND type = 'refund';

CREATE OR REPLACE VIEW app_receipts_public AS
SELECT
  id,
  user_id,
  type AS kind,
  amount_cents,
  currency,
  description,
  created_at,
  job_id,
  NULL::bigint AS tax_amount_cents,
  NULL::bigint AS discount_amount_cents
FROM app_receipts;

-- Stripe Hooks
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- User Roles & Preferences
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'user',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY,
  default_share_public BOOLEAN NOT NULL DEFAULT TRUE,
  default_allow_index BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin Audit
CREATE TABLE IF NOT EXISTS admin_audit (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID NOT NULL,
  target_user_id UUID,
  action TEXT NOT NULL,
  route TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_admin_idx ON admin_audit (admin_id, created_at DESC);

-- Profiles Extensions
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS preferred_currency TEXT CHECK (preferred_currency IN ('eur','usd','gbp','chf')),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS synced_from_supabase BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS profiles_preferred_currency_idx ON profiles (preferred_currency);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_items (
  playlist_id UUID NOT NULL,
  video_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, video_id)
);
CREATE INDEX IF NOT EXISTS playlist_items_playlist_idx ON playlist_items (playlist_id, order_index);

-- Homepage Sections
CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  video_id TEXT,
  playlist_id UUID,
  order_index INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS homepage_sections_active_idx ON homepage_sections (enabled, order_index);

-- Vendor & Payouts
CREATE TABLE IF NOT EXISTS vendor_balances (
  id BIGSERIAL PRIMARY KEY,
  destination_acct TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  pending_cents BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (destination_acct, currency)
);

CREATE TABLE IF NOT EXISTS payout_batches (
  id BIGSERIAL PRIMARY KEY,
  destination_acct TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  amount_cents BIGINT NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Fal Queue Log
CREATE TABLE IF NOT EXISTS fal_queue_log (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_job_id TEXT,
  engine_id TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fal_queue_log_job_idx ON fal_queue_log (job_id, created_at DESC);

-- Metrics
CREATE TABLE IF NOT EXISTS app_generate_metrics (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT,
  user_id TEXT,
  engine_id TEXT NOT NULL,
  engine_label TEXT,
  mode TEXT,
  attempt_status TEXT NOT NULL,
  error_code TEXT,
  duration_ms INTEGER,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS app_generate_metrics_engine_idx ON app_generate_metrics (engine_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_generate_metrics_job_idx ON app_generate_metrics (job_id) WHERE job_id IS NOT NULL;

-- User Assets
CREATE TABLE IF NOT EXISTS user_assets (
  id BIGSERIAL PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  user_id TEXT,
  url TEXT NOT NULL,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes BIGINT,
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_assets_user_created_idx ON user_assets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_assets_user_source_origin_idx ON user_assets (user_id, source, (metadata->>'originUrl'));

-- Email Events
CREATE TABLE IF NOT EXISTS email_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  recipient TEXT,
  provider_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_events_created_idx ON email_events (created_at DESC);
CREATE INDEX IF NOT EXISTS email_events_recipient_idx ON email_events (recipient);
