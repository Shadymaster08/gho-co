-- Etsy Trend Analyzer report log
-- Stores the output of each Etsy trend scan (Agent 8)

CREATE TABLE IF NOT EXISTS etsy_trend_reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at         timestamptz NOT NULL DEFAULT now(),
  findings       jsonb NOT NULL,          -- array of CategoryReport (see API route types)
  total_listings integer NOT NULL DEFAULT 0,
  triggered_by   text NOT NULL DEFAULT 'manual'   -- 'manual' | 'cron'
);

-- RLS: admins only
ALTER TABLE etsy_trend_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_etsy_reports" ON etsy_trend_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
