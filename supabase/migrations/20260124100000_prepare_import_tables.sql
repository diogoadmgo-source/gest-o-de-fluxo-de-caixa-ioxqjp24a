-- Migration to prepare import_logs_receivables table for enhanced RPC logging
-- Adding columns that are expected by the import_receivables_replace RPC

DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_logs_receivables' AND column_name = 'status') THEN
        ALTER TABLE public.import_logs_receivables ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;

    -- Add error_message column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_logs_receivables' AND column_name = 'error_message') THEN
        ALTER TABLE public.import_logs_receivables ADD COLUMN error_message TEXT;
    END IF;

    -- Add finished_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_logs_receivables' AND column_name = 'finished_at') THEN
        ALTER TABLE public.import_logs_receivables ADD COLUMN finished_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add total_amount_imported column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_logs_receivables' AND column_name = 'total_amount_imported') THEN
        ALTER TABLE public.import_logs_receivables ADD COLUMN total_amount_imported NUMERIC DEFAULT 0;
    END IF;
END $$;
