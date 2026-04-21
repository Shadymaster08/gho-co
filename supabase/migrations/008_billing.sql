-- Add address fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_line1  text,
  ADD COLUMN IF NOT EXISTS address_line2  text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS province       text DEFAULT 'QC',
  ADD COLUMN IF NOT EXISTS postal_code    text,
  ADD COLUMN IF NOT EXISTS country        text DEFAULT 'CA';

-- Add billing snapshot to orders (captured at submission time)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS billing jsonb;
