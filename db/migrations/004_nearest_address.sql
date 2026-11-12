-- Nearest road, postal code and city to a visit's coordinates, looked up with
-- OpenStreetMap. Approximate: the coordinates come from the IP address and
-- mark where the internet connection is registered, not where the person is.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS near_road       TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS near_postcode   TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS near_city       TEXT;
-- Set once the point has been looked up, also when nothing was found there.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS near_checked_at TIMESTAMPTZ;

-- Visits at a point that was looked up before reuse that answer.
CREATE INDEX IF NOT EXISTS sessions_point_idx ON sessions (latitude, longitude);
