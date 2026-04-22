-- Expense tracker: internal admin-only expense management

CREATE SEQUENCE IF NOT EXISTS expense_number_seq START 1;

CREATE TABLE IF NOT EXISTS expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number  text UNIQUE NOT NULL DEFAULT (
    'EXP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('expense_number_seq')::text, 4, '0')
  ),
  title           text NOT NULL,
  category        text NOT NULL CHECK (category IN ('supplies', 'membership', 'tools_equipment', 'other')),
  amount_cents    integer NOT NULL CHECK (amount_cents >= 0),
  date            date NOT NULL,
  description     text,
  paid_by         uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled')),
  created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_splits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id      uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  admin_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  share_cents     integer NOT NULL CHECK (share_cents >= 0),
  is_reimbursed   boolean NOT NULL DEFAULT false,
  reimbursed_at   timestamptz,
  notes           text
);

-- updated_at trigger for expenses
CREATE OR REPLACE FUNCTION set_expenses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_expenses_updated_at();

-- RLS: admin-only access
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_expenses" ON expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_splits" ON expense_splits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
