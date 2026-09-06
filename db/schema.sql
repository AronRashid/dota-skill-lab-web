CREATE TABLE IF NOT EXISTS dsl_users (
  steam_id64 TEXT PRIMARY KEY,
  account_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsl_user_state (
  steam_id64 TEXT PRIMARY KEY REFERENCES dsl_users(steam_id64) ON DELETE CASCADE,
  role_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  rating_manual JSONB NOT NULL DEFAULT '{}'::jsonb,
  training JSONB,
  journal TEXT NOT NULL DEFAULT '',
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  revision BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dsl_user_state_updated_idx ON dsl_user_state(updated_at DESC);

-- Reserved for the next optimization pass: normalized/cached Steam match payloads.
CREATE TABLE IF NOT EXISTS dsl_match_cache (
  account_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  match_seq_num TEXT,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, match_id)
);
CREATE INDEX IF NOT EXISTS dsl_match_cache_account_fetched_idx ON dsl_match_cache(account_id, fetched_at DESC);
