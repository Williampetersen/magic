-- Location insights. The app also adds these by itself (src/lib/tracking/schema.ts).

-- The site owner marked this visitor as themselves: hidden from statistics.
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS excluded BOOLEAN NOT NULL DEFAULT false;

-- 'ipinfo' when the location came from the IPinfo lookup instead of Vercel.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS geo_source TEXT;

-- Link scanners recorded before they were filtered out (2000 x 2000 screen, or
-- Meta's own networks outside Denmark). Hidden, not deleted.
UPDATE sessions SET is_bot = true
WHERE NOT is_bot AND (
  (screen_width = 2000 AND screen_height = 2000)
  OR (COALESCE(country_code, '') <> 'DK' AND (
    ip_masked LIKE '2a03:2880:%'
    OR split_part(ip_masked, '.', 1) || '.' || split_part(ip_masked, '.', 2) IN (
      '31.13', '45.64', '57.141', '57.144', '57.145', '57.146', '57.147', '66.220',
      '69.63', '69.171', '74.119', '102.132', '103.4', '129.134', '157.240', '163.70',
      '163.77', '173.252', '179.60', '185.60', '185.89', '204.15'
    )
  ))
);

CREATE INDEX IF NOT EXISTS sessions_visible_idx ON sessions (started_at DESC) WHERE NOT is_bot;
