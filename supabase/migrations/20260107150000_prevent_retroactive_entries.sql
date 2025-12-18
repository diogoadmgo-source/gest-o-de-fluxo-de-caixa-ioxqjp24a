-- Migration to prevent retroactive entries on bank_balances and financial_adjustments

-- Function to check if the date is retroactive for financial_adjustments
CREATE OR REPLACE FUNCTION check_not_retroactive()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if date is before today
  -- Using CURRENT_DATE which returns the date of the transaction start in the server timezone
  IF NEW.date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Não é possível realizar lançamentos com data retroativa.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if the date is retroactive for bank_balances (using reference_date)
CREATE OR REPLACE FUNCTION check_bank_balance_retroactive()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if reference_date is before today
  IF NEW.reference_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Não é possível realizar lançamentos com data retroativa.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger for financial_adjustments
DROP TRIGGER IF EXISTS check_financial_adjustments_date ON public.financial_adjustments;
CREATE TRIGGER check_financial_adjustments_date
BEFORE INSERT OR UPDATE ON public.financial_adjustments
FOR EACH ROW EXECUTE FUNCTION check_not_retroactive();

-- Create Trigger for bank_balances
DROP TRIGGER IF EXISTS check_bank_balances_date ON public.bank_balances;
CREATE TRIGGER check_bank_balances_date
BEFORE INSERT OR UPDATE ON public.bank_balances
FOR EACH ROW EXECUTE FUNCTION check_bank_balance_retroactive();

-- Create Trigger for bank_balances_v2 (if exists, to comply with user story mentioning it explicitly)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bank_balances_v2') THEN
        DROP TRIGGER IF EXISTS check_bank_balances_v2_date ON public.bank_balances_v2;
        CREATE TRIGGER check_bank_balances_v2_date
        BEFORE INSERT OR UPDATE ON public.bank_balances_v2
        FOR EACH ROW EXECUTE FUNCTION check_bank_balance_retroactive();
    END IF;
END $$;
