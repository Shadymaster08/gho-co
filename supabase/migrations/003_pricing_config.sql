-- Supplier price configuration table
-- Tracks current prices and when they were last verified

CREATE TABLE IF NOT EXISTS price_configs (
  id          text PRIMARY KEY,        -- e.g. 'shirt_tshirt', 'dtf_per_sqin'
  label       text        NOT NULL,
  category    text        NOT NULL,    -- 'shirts' | 'dtf' | 'filament'
  value_cents integer     NOT NULL,    -- price in cents (e.g. 310 = $3.10)
  unit        text        NOT NULL,    -- 'per_unit', 'per_sqin', 'per_kg'
  supplier    text,
  supplier_url text,
  last_verified_at timestamptz,
  notes       text,
  updated_at  timestamptz DEFAULT now()
);

-- RLS: admins only
ALTER TABLE price_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_price_configs" ON price_configs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed default prices
INSERT INTO price_configs (id, label, category, value_cents, unit, supplier, supplier_url, notes) VALUES
  ('shirt_tshirt',    'T-Shirt (G5000)',         'shirts',   310,  'per_unit',  'Fabrik.ca', 'https://fabrik.ca/en-ca/products/heavy-cottontm-t-shirt',                 'Approx. base price — verify current pricing'),
  ('shirt_longsleeve','Long Sleeve (G5400)',      'shirts',   650,  'per_unit',  'Fabrik.ca', 'https://fabrik.ca/en-ca/products/heavy-cottontm-long-sleeve-t-shirt',      null),
  ('shirt_crewneck',  'Crewneck (G18000)',        'shirts',  1400,  'per_unit',  'Fabrik.ca', 'https://fabrik.ca/en-ca/products/heavy-blendtm-crewneck-sweatshirt',       null),
  ('shirt_hoodie',    'Hoodie (G18500)',          'shirts',  1800,  'per_unit',  'Fabrik.ca', 'https://fabrik.ca/en-ca/products/heavy-blendtm-hooded-sweatshirt',         null),
  ('shirt_ziphoodie', 'Zip Hoodie (G18600)',      'shirts',  1800,  'per_unit',  'Fabrik.ca', 'https://fabrik.ca/en-ca/products/heavy-blendtm-full-zip-hooded-sweatshirt',null),
  ('dtf_per_sqin',    'DTF Transfer (per sq in)', 'dtf',        2,  'per_sqin',  'Ninja Transfers', 'https://ninjatransfers.com/', '$0.02/sq inch — very stable price'),
  ('filament_pla_basic',  'PLA Basic filament',  'filament', 2900, 'per_kg',    'Bambu Lab', 'https://ca.store.bambulab.com/collections/bambu-lab-3d-printer-filament', '~$29/kg'),
  ('filament_pla_matte',  'PLA Matte filament',  'filament', 2900, 'per_kg',    'Bambu Lab', 'https://ca.store.bambulab.com/collections/bambu-lab-3d-printer-filament', '~$29/kg'),
  ('filament_pla_silk',   'PLA Silk filament',   'filament', 3200, 'per_kg',    'Bambu Lab', 'https://ca.store.bambulab.com/collections/bambu-lab-3d-printer-filament', '~$32/kg'),
  ('filament_petg',        'PETG filament',       'filament', 2200, 'per_kg',    'Bambu Lab', 'https://ca.store.bambulab.com/collections/bambu-lab-3d-printer-filament', '~$22/kg'),
  ('filament_tpu',         'TPU filament',        'filament', 3200, 'per_kg',    'Bambu Lab', 'https://ca.store.bambulab.com/collections/bambu-lab-3d-printer-filament', '~$32/kg')
ON CONFLICT (id) DO NOTHING;
