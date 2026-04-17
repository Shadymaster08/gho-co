-- Portfolio images table for the AI-enhanced product image agent
CREATE TABLE portfolio_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  product_type TEXT,
  original_storage_path TEXT,
  original_public_url TEXT NOT NULL,
  generated_storage_path TEXT,
  generated_public_url TEXT,
  prompt_used TEXT,
  replicate_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;

-- Public can read published images (for the public portfolio page)
CREATE POLICY "Public read published" ON portfolio_images
  FOR SELECT USING (published = true);

-- Admins can do everything
CREATE POLICY "Admin all" ON portfolio_images
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
