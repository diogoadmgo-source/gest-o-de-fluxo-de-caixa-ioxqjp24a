-- Migration to add indices for performance optimization
-- Focus on columns used for filtering and sorting in Receivables and Payables

-- Receivables Indices
CREATE INDEX IF NOT EXISTS idx_receivables_company_status_date 
ON public.receivables(company_id, title_status, due_date);

CREATE INDEX IF NOT EXISTS idx_receivables_invoice_search
ON public.receivables(company_id, invoice_number);

CREATE INDEX IF NOT EXISTS idx_receivables_customer_search
ON public.receivables(company_id, customer);

CREATE INDEX IF NOT EXISTS idx_receivables_order_search
ON public.receivables(company_id, order_number);

CREATE INDEX IF NOT EXISTS idx_receivables_created_at
ON public.receivables(created_at);

-- Payables (Transactions) Indices
CREATE INDEX IF NOT EXISTS idx_transactions_company_type_status
ON public.transactions(company_id, type, status);

CREATE INDEX IF NOT EXISTS idx_transactions_due_date_sort
ON public.transactions(company_id, due_date);

CREATE INDEX IF NOT EXISTS idx_transactions_entity_search
ON public.transactions(company_id, entity_name);

CREATE INDEX IF NOT EXISTS idx_transactions_document_search
ON public.transactions(company_id, document_number);

-- Performance Logs Indices
CREATE INDEX IF NOT EXISTS idx_performance_logs_route_action
ON public.performance_logs(route, action);
