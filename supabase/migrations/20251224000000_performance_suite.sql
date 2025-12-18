-- Performance Optimization Suite Migration

-- 1. Create Performance Logs Table
CREATE TABLE IF NOT EXISTS public.performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    route TEXT,
    action TEXT,
    duration_ms NUMERIC,
    meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_performance_logs_created_at ON public.performance_logs(created_at);
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view performance logs" ON public.performance_logs
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles WHERE profile = 'Administrator'
        )
    );

CREATE POLICY "Authenticated users can insert performance logs" ON public.performance_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 2. Database Indexing Strategy
-- Receivables
CREATE INDEX IF NOT EXISTS idx_receivables_company_id ON public.receivables(company_id);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON public.receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON public.receivables(title_status);
CREATE INDEX IF NOT EXISTS idx_receivables_customer ON public.receivables(customer);
CREATE INDEX IF NOT EXISTS idx_receivables_invoice ON public.receivables(invoice_number);

-- Payables (Transactions)
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON public.transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Payables (New Table if used)
CREATE INDEX IF NOT EXISTS idx_payables_company_id ON public.payables(company_id);

-- Import Logs
CREATE INDEX IF NOT EXISTS idx_import_logs_company_id ON public.import_logs(company_id);

-- 3. Optimized RPCs for Dashboard Consolidation

-- Get Dashboard KPIs (Single Query)
CREATE OR REPLACE FUNCTION get_dashboard_kpis(
    p_company_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_receivables NUMERIC;
    v_total_payables NUMERIC;
    v_overdue_receivables_count INTEGER;
    v_runway_days NUMERIC;
    v_balance NUMERIC;
    v_avg_daily_outflow NUMERIC;
BEGIN
    -- Current Balance (Anchor)
    SELECT COALESCE(SUM(amount), 0) INTO v_balance
    FROM bank_balances_v2 bb
    JOIN banks b ON bb.bank_id = b.id
    WHERE bb.company_id = p_company_id
      AND bb.reference_date <= p_date
      AND b.active = true
      AND bb.reference_date = (
          SELECT MAX(reference_date)
          FROM bank_balances_v2 bb2
          WHERE bb2.bank_id = bb.bank_id
            AND bb2.reference_date <= p_date
      );

    -- Overdue Count
    SELECT COUNT(*) INTO v_overdue_receivables_count
    FROM receivables
    WHERE company_id = p_company_id
      AND title_status = 'Aberto'
      AND due_date < p_date;

    -- Avg Outflow (Next 30 days)
    SELECT COALESCE(SUM(amount), 0) / 30.0 INTO v_avg_daily_outflow
    FROM transactions
    WHERE company_id = p_company_id
      AND type = 'payable'
      AND status NOT IN ('paid', 'cancelled')
      AND due_date BETWEEN p_date AND (p_date + 30);

    IF v_avg_daily_outflow > 0 THEN
        v_runway_days := v_balance / v_avg_daily_outflow;
    ELSE
        v_runway_days := 999;
    END IF;

    RETURN jsonb_build_object(
        'current_balance', v_balance,
        'overdue_count', v_overdue_receivables_count,
        'runway_days', v_runway_days,
        'avg_daily_outflow', v_avg_daily_outflow
    );
END;
$$;

-- Get Daily Aggregates for Projection (Consolidated)
CREATE OR REPLACE FUNCTION get_cash_flow_aggregates(
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    day DATE,
    total_receivables NUMERIC,
    total_payables NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.day::DATE,
        COALESCE(r.total, 0) as total_receivables,
        COALESCE(p.total, 0) as total_payables
    FROM
        generate_series(p_start_date, p_end_date, '1 day'::interval) d(day)
    LEFT JOIN (
        SELECT due_date, SUM(COALESCE(updated_value, principal_value, 0)) as total
        FROM receivables
        WHERE company_id = p_company_id
          AND title_status != 'Cancelado'
          AND (
              (due_date < CURRENT_DATE) -- Historical: take all except cancelled
              OR
              (title_status = 'Aberto') -- Future: take only open
          )
        GROUP BY due_date
    ) r ON r.due_date = d.day::DATE
    LEFT JOIN (
        SELECT due_date, SUM(amount) as total
        FROM transactions
        WHERE company_id = p_company_id
          AND type = 'payable'
          AND status != 'cancelled'
          AND (
              (due_date < CURRENT_DATE)
              OR
              (status != 'paid')
          )
        GROUP BY due_date
    ) p ON p.due_date = d.day::DATE;
END;
$$;
