-- Contact-form leads (kept even when the visitor did not accept tracking cookies)
CREATE TABLE IF NOT EXISTS leads (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  service     TEXT,
  plan        TEXT,
  visitor_id  UUID REFERENCES visitors(id) ON DELETE SET NULL,
  session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS high_interest BOOLEAN NOT NULL DEFAULT false;
