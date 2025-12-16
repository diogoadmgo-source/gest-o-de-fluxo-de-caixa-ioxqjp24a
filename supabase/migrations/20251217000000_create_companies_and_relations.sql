-- Create companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add company_id to existing tables (assuming these tables would exist in a real scenario matching the types)
-- Since we are defining the schema structure via migrations for the first time effectively:

-- For Receivables (simulated table structure based on usage)
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  -- other fields would go here
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- For Payables/Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  -- other fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- For Banks
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  -- other fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- For Bank Balances
CREATE TABLE IF NOT EXISTS bank_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  -- other fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to populate companies from distinct company names in receivables import (conceptual)
-- This would be triggered or called after import
