CREATE TABLE product_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  process_number TEXT,
  description TEXT NOT NULL,
  international_supplier TEXT NOT NULL,
  foreign_currency_value NUMERIC NOT NULL,
  foreign_currency_code TEXT NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  logistics_costs NUMERIC DEFAULT 0,
  taxes NUMERIC DEFAULT 0,
  nationalization_costs NUMERIC DEFAULT 0,
  status TEXT NOT NULL,
  start_date DATE NOT NULL,
  expected_arrival_date DATE,
  actual_arrival_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE product_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product_imports for their companies" ON product_imports
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert product_imports for their companies" ON product_imports
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update product_imports for their companies" ON product_imports
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete product_imports for their companies" ON product_imports
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
