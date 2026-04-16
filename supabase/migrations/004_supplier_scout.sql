-- Supplier Scout report log
-- Stores the output of each supplier comparison run

CREATE TABLE IF NOT EXISTS supplier_scout_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at       timestamptz NOT NULL DEFAULT now(),
  findings     jsonb NOT NULL,          -- array of { category, current_supplier, alternative_name, alternative_url, estimated_saving_pct, summary }
  total_findings integer NOT NULL DEFAULT 0,
  triggered_by text NOT NULL DEFAULT 'manual',  -- 'manual' | 'cron'
  email_sent   boolean NOT NULL DEFAULT false
);

-- RLS: admins only
ALTER TABLE supplier_scout_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_scout_reports" ON supplier_scout_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
