-- Create Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  days_before_due integer NOT NULL DEFAULT 3,
  email_enabled boolean NOT NULL DEFAULT true,
  app_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS for settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RPC for aggregated charts data
CREATE OR REPLACE FUNCTION get_payable_charts_data(
  p_company_id uuid,
  p_search text DEFAULT NULL,
  p_supplier text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_date_range_start date DEFAULT NULL,
  p_date_range_end date DEFAULT NULL,
  p_min_value numeric DEFAULT NULL,
  p_max_value numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timeline json;
  v_suppliers json;
BEGIN
  -- Create a temp table or CTE to hold filtered data to avoid repetition
  CREATE TEMP TABLE filtered_payables AS
    SELECT 
      t.due_date,
      t.amount,
      t.entity_name
    FROM transactions t
    WHERE t.company_id = p_company_id
      AND t.type = 'payable'
      AND (p_search IS NULL OR p_search = '' OR (t.document_number ILIKE '%' || p_search || '%' OR t.entity_name ILIKE '%' || p_search || '%'))
      AND (p_supplier IS NULL OR p_supplier = '' OR t.entity_name ILIKE '%' || p_supplier || '%')
      AND (
        p_status IS NULL OR p_status = 'all' OR
        (p_status = 'overdue' AND t.status = 'pending' AND t.due_date < CURRENT_DATE) OR
        (p_status = 'due_today' AND t.due_date = CURRENT_DATE) OR
        (p_status = 'upcoming' AND t.status = 'pending' AND t.due_date >= CURRENT_DATE) OR
        (p_status NOT IN ('all', 'overdue', 'due_today', 'upcoming') AND t.status = p_status)
      )
      AND (p_date_range_start IS NULL OR t.due_date >= p_date_range_start)
      AND (p_date_range_end IS NULL OR t.due_date <= p_date_range_end)
      AND (p_min_value IS NULL OR t.amount >= p_min_value)
      AND (p_max_value IS NULL OR t.amount <= p_max_value);

  -- Timeline Aggregation (Daily)
  SELECT json_agg(t) INTO v_timeline
  FROM (
    SELECT 
      due_date as date, 
      SUM(amount) as total 
    FROM filtered_payables 
    GROUP BY due_date 
    ORDER BY due_date ASC
  ) t;

  -- Supplier Aggregation (Top 10)
  SELECT json_agg(s) INTO v_suppliers
  FROM (
    SELECT 
      entity_name as name, 
      SUM(amount) as value 
    FROM filtered_payables 
    GROUP BY entity_name 
    ORDER BY value DESC 
    LIMIT 10
  ) s;

  DROP TABLE filtered_payables;

  RETURN json_build_object(
    'timeline', COALESCE(v_timeline, '[]'::json),
    'suppliers', COALESCE(v_suppliers, '[]'::json)
  );
END;
$$;
