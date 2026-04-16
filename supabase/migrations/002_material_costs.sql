-- Add material cost tracking to quotes so profit margin can be reported
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS material_cost_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percent     numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_cents > 0
      THEN ROUND(((total_cents - material_cost_cents)::numeric / total_cents) * 100, 2)
      ELSE 0
    END
  ) STORED;
