-- Visitor tracking schema (Instagram-focused analytics)

CREATE TABLE IF NOT EXISTS visitors (
  id                UUID PRIMARY KEY,
  first_seen        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen         TIMESTAMPTZ NOT NULL DEFAULT now(),
  visit_count       INTEGER NOT NULL DEFAULT 0,
  first_source      TEXT,
  first_campaign    TEXT,
  linked_lead_name  TEXT,
  linked_lead_email TEXT,
  linked_lead_phone TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id                UUID PRIMARY KEY,
  visitor_id        UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  source            TEXT NOT NULL DEFAULT 'other',      -- instagram | other
  ig_placement      TEXT,                               -- bio | story | post | dm | unknown
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  utm_content       TEXT,
  referrer          TEXT,
  landing_page      TEXT,
  exit_page         TEXT,
  page_count        INTEGER NOT NULL DEFAULT 0,
  duration_seconds  INTEGER NOT NULL DEFAULT 0,
  country           TEXT,
  country_code      TEXT,
  region            TEXT,
  city              TEXT,
  postal_code       TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  timezone          TEXT,
  ip_masked         TEXT,                               -- e.g. 85.191.xxx.xxx
  ip_hash           TEXT,                               -- salted SHA-256
  isp               TEXT,
  user_agent        TEXT,
  device_type       TEXT,
  device_vendor     TEXT,
  device_model      TEXT,
  os                TEXT,
  os_version        TEXT,
  browser           TEXT,
  browser_version   TEXT,
  is_instagram_in_app_browser BOOLEAN NOT NULL DEFAULT false,
  language          TEXT,
  screen_width      INTEGER,
  screen_height     INTEGER,
  viewport          TEXT,
  connection_type   TEXT,
  is_bot            BOOLEAN NOT NULL DEFAULT false,
  is_returning      BOOLEAN NOT NULL DEFAULT false,
  converted         BOOLEAN NOT NULL DEFAULT false,
  visit_number      INTEGER NOT NULL DEFAULT 1,
  form_started      BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS sessions_visitor_idx  ON sessions (visitor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS sessions_started_idx  ON sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS sessions_source_idx   ON sessions (source, started_at DESC);
CREATE INDEX IF NOT EXISTS sessions_open_idx     ON sessions (last_activity_at) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS sessions_iphash_idx   ON sessions (ip_hash);

CREATE TABLE IF NOT EXISTS pageviews (
  id                   UUID PRIMARY KEY,
  session_id           UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  path                 TEXT NOT NULL,
  title                TEXT,
  entered_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_on_page_seconds INTEGER NOT NULL DEFAULT 0,
  max_scroll_percent   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS pageviews_session_idx ON pageviews (session_id, entered_at);

CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  label       TEXT,
  path        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_session_idx ON events (session_id, created_at);

-- One row per email. dedupe_key is unique so the same email is never sent twice.
CREATE TABLE IF NOT EXISTS notifications (
  id            BIGSERIAL PRIMARY KEY,
  session_id    UUID REFERENCES sessions(id) ON DELETE SET NULL,
  visitor_id    UUID REFERENCES visitors(id) ON DELETE SET NULL,
  trigger_type  TEXT NOT NULL,
  dedupe_key    TEXT NOT NULL UNIQUE,
  recipient     TEXT,
  subject       TEXT,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',        -- pending | sent | failed
  error         TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_sent_idx    ON notifications (sent_at DESC);
CREATE INDEX IF NOT EXISTS notifications_visitor_idx ON notifications (visitor_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

-- Visits counted before/without cookie consent: no cookie, no IP, no details.
CREATE TABLE IF NOT EXISTS anonymous_visits (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  source        TEXT NOT NULL DEFAULT 'other',
  path          TEXT,
  country_code  TEXT
);
CREATE INDEX IF NOT EXISTS anonymous_visits_created_idx ON anonymous_visits (created_at DESC);
