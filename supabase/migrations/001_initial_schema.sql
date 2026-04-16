-- ============================================================
-- 1PXL Custom Shop — Initial Schema
-- ============================================================

-- Human-readable number sequences
CREATE SEQUENCE order_number_seq START 1;
CREATE SEQUENCE quote_number_seq START 1;
CREATE SEQUENCE invoice_number_seq START 1;

-- ============================================================
-- profiles — extends auth.users
-- ============================================================
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  phone       text,
  role        text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- orders
-- ============================================================
CREATE TABLE public.orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        text UNIQUE NOT NULL DEFAULT
    'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 4, '0'),
  customer_id         uuid NOT NULL REFERENCES public.profiles(id),
  product_type        text NOT NULL CHECK (product_type IN ('shirt', '3d_print', 'diy', 'lighting')),
  status              text NOT NULL DEFAULT 'received' CHECK (status IN (
    'received', 'in_review', 'quoted', 'approved',
    'in_production', 'shipped', 'complete', 'cancelled'
  )),
  configuration       jsonb NOT NULL DEFAULT '{}',
  customer_notes      text,
  admin_notes         text,
  printful_order_id   text,
  printful_status     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer_id   ON public.orders(customer_id);
CREATE INDEX idx_orders_status        ON public.orders(status);
CREATE INDEX idx_orders_product_type  ON public.orders(product_type);
CREATE INDEX idx_orders_created_at    ON public.orders(created_at DESC);

-- ============================================================
-- order_files
-- ============================================================
CREATE TABLE public.order_files (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_type         text NOT NULL CHECK (file_type IN ('front_artwork', 'back_artwork', 'stl', 'reference')),
  storage_path      text NOT NULL,
  file_name         text NOT NULL,
  file_size_bytes   bigint,
  mime_type         text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_files_order_id ON public.order_files(order_id);

-- ============================================================
-- quotes
-- ============================================================
CREATE TABLE public.quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number    text UNIQUE NOT NULL DEFAULT
    'QTE-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quote_number_seq')::text, 4, '0'),
  order_id        uuid NOT NULL REFERENCES public.orders(id),
  created_by      uuid NOT NULL REFERENCES public.profiles(id),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'accepted', 'declined', 'expired'
  )),
  line_items      jsonb NOT NULL DEFAULT '[]',
  subtotal_cents  integer NOT NULL DEFAULT 0,
  tax_rate        numeric(5,4) NOT NULL DEFAULT 0,
  tax_cents       integer NOT NULL DEFAULT 0,
  total_cents     integer NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'USD',
  valid_until     date,
  notes           text,
  internal_notes  text,
  sent_at         timestamptz,
  accepted_at     timestamptz,
  declined_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_order_id ON public.quotes(order_id);
CREATE INDEX idx_quotes_status   ON public.quotes(status);

-- ============================================================
-- invoices
-- ============================================================
CREATE TABLE public.invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number        text UNIQUE NOT NULL DEFAULT
    'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_number_seq')::text, 4, '0'),
  order_id              uuid NOT NULL REFERENCES public.orders(id),
  quote_id              uuid REFERENCES public.quotes(id),
  created_by            uuid NOT NULL REFERENCES public.profiles(id),
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'paid', 'voided'
  )),
  line_items            jsonb NOT NULL DEFAULT '[]',
  subtotal_cents        integer NOT NULL DEFAULT 0,
  tax_rate              numeric(5,4) NOT NULL DEFAULT 0,
  tax_cents             integer NOT NULL DEFAULT 0,
  total_cents           integer NOT NULL DEFAULT 0,
  currency              text NOT NULL DEFAULT 'USD',
  due_date              date,
  notes                 text,
  payment_instructions  text,
  paid_at               timestamptz,
  sent_at               timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_invoices_status   ON public.invoices(status);

-- ============================================================
-- email_log
-- ============================================================
CREATE TABLE public.email_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email     text NOT NULL,
  template            text NOT NULL,
  related_id          uuid,
  resend_message_id   text,
  status              text NOT NULL DEFAULT 'sent',
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Helper: is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at  BEFORE UPDATE ON public.profiles  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_orders_updated_at    BEFORE UPDATE ON public.orders     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_quotes_updated_at    BEFORE UPDATE ON public.quotes     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_invoices_updated_at  BEFORE UPDATE ON public.invoices   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log  ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: own read"    ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles: own update"  ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- orders
CREATE POLICY "orders: customer read"   ON public.orders FOR SELECT USING (customer_id = auth.uid() OR public.is_admin());
CREATE POLICY "orders: customer insert" ON public.orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "orders: admin update"    ON public.orders FOR UPDATE USING (public.is_admin());
CREATE POLICY "orders: admin delete"    ON public.orders FOR DELETE USING (public.is_admin());

-- order_files
CREATE POLICY "order_files: read"   ON public.order_files FOR SELECT
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = order_files.order_id AND orders.customer_id = auth.uid()
  ));
CREATE POLICY "order_files: insert" ON public.order_files FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
  OR public.is_admin()
);
CREATE POLICY "order_files: admin delete" ON public.order_files FOR DELETE USING (public.is_admin());

-- quotes
CREATE POLICY "quotes: customer read" ON public.quotes FOR SELECT
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = quotes.order_id AND orders.customer_id = auth.uid()
  ));
CREATE POLICY "quotes: customer update status" ON public.quotes FOR UPDATE
  USING (
    public.is_admin() OR (
      EXISTS (SELECT 1 FROM public.orders WHERE orders.id = quotes.order_id AND orders.customer_id = auth.uid())
      AND status = 'sent'
    )
  );
CREATE POLICY "quotes: admin insert"  ON public.quotes FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "quotes: admin delete"  ON public.quotes FOR DELETE USING (public.is_admin());

-- invoices
CREATE POLICY "invoices: customer read" ON public.invoices FOR SELECT
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = invoices.order_id AND orders.customer_id = auth.uid()
  ));
CREATE POLICY "invoices: admin insert"  ON public.invoices FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "invoices: admin update"  ON public.invoices FOR UPDATE USING (public.is_admin());
CREATE POLICY "invoices: admin delete"  ON public.invoices FOR DELETE USING (public.is_admin());

-- email_log (admin read only)
CREATE POLICY "email_log: admin read" ON public.email_log FOR SELECT USING (public.is_admin());
CREATE POLICY "email_log: insert"     ON public.email_log FOR INSERT WITH CHECK (true);
