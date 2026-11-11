-- Failed admin logins, used to slow down password guessing.
-- Only a salted hash of the IP address is stored.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id           BIGSERIAL PRIMARY KEY,
  ip_hash      TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_login_attempts_idx ON admin_login_attempts (ip_hash, attempted_at DESC);
