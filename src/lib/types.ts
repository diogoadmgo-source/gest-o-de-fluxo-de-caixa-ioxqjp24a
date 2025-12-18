export type TransactionStatus =
  | 'pending'
  | 'paid'
  | 'received'
  | 'overdue'
  | 'cancelled'

export interface Company {
  id: string
  name: string
  origin?: string
}

export interface Transaction {
  id: string
  company_id: string
  document_number: string
  entity_name: string
  entity_document?: string
  issue_date: string
  due_date: string
  amount: number
  principal_value?: number
  fine?: number
  interest?: number
  net_amount?: number
  category: string
  status: TransactionStatus
  type: 'receivable' | 'payable'
  payment_method?: string
  notes?: string
  description?: string
}

export interface Receivable {
  id: string
  company_id: string
  company: string
  issue_date: string
  order_number: string
  invoice_number: string
  title_status: string
  code?: string
  customer_code?: string
  customer: string
  customer_doc: string
  state?: string
  uf?: string
  regional?: string
  salesperson?: string
  seller?: string
  installment?: string
  due_date: string
  days_overdue?: number
  principal_value: number
  fine: number
  interest: number
  updated_value: number
  utilization?: string
  is_negative?: boolean
  negativado?: string
  payment_prediction: string
  description?: string
  created_at?: string
  customer_name?: string
  new_status?: string
}

export interface Payable {
  id: string
  company_id: string
  description?: string
  due_date: string | null
  fine?: number
  interest?: number
  issue_date?: string | null
  nf?: string | null
  payment_prediction?: string | null
  principal_value?: number
  supplier_cnpj?: string | null
  supplier_name?: string | null
  title_status?: string | null
  created_at?: string
}

export interface FinancialAdjustment {
  id: string
  company_id: string
  type: 'credit' | 'debit'
  amount: number
  date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  user_id?: string
  created_at?: string
}

export interface KPI {
  pmr: number
  pmp: number
  cash_gap: number
  days_until_zero: number
}

export interface DailyBalance {
  date: string
  closing_balance: number
  is_projected: boolean
  total_inflows: number
  total_outflows: number
  net_flow: number
}

export interface CashFlowEntry {
  date: string
  opening_balance: number
  total_receivables: number
  total_payables: number
  imports: number
  other_expenses: number
  adjustments_credit: number
  adjustments_debit: number
  daily_balance: number
  accumulated_balance: number
  notes?: string
  has_alert?: boolean
  alert_message?: string
  is_projected?: boolean
  is_weekend?: boolean
}

export interface Bank {
  id: string
  company_id: string
  name: string
  code: string
  institution: string
  agency?: string
  account_number: string
  account_digit?: string
  active: boolean
  type: 'bank' | 'cash'
  created_at?: string
}

export interface BankBalance {
  id: string
  company_id: string
  date: string
  bank_name: string
  bank_id: string
  account_number: string
  balance: number
  status: 'draft' | 'saved' | 'locked'
}

export interface HistoricalBalance {
  id: string
  date: string
  consolidated_balance: number
  user_name: string
  timestamp: string
}

export interface Alert {
  id: string
  type: 'funding' | 'receivable_overdue' | 'payable_overdue'
  severity: 'high' | 'medium' | 'low'
  message: string
  date: string
  amount?: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'analyst' | 'viewer'
  avatar_url?: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  profile: 'Administrator' | 'User'
  status: 'Pending' | 'Active' | 'Inactive' | 'Blocked'
  last_access?: string
  company_id?: string
  is_2fa_enabled: boolean
  created_at: string
}

export interface Log {
  id: string
  timestamp: string
  user_id: string
  user_name: string
  action: string
  entity_affected: string
  result: 'success' | 'failure'
  details?: string
}

export interface AuditLog {
  id: string
  action: string
  entity: string
  entity_id?: string
  details?: any
  user_id: string
  ip_address?: string
  created_at: string
}

export interface ImportHistoryEntry {
  id: string
  date: string
  filename: string
  type: 'receivable' | 'payable' | 'bank_statement'
  status: 'success' | 'error'
  records_count: number
  user_name: string
  company_id: string
  success_count?: number
  error_count?: number
  deleted_count?: number
  error_details?: any
  created_at?: string
}

export interface ProductImport {
  id: string
  company_id: string
  user_id: string
  process_number?: string
  description: string
  international_supplier: string
  foreign_currency_value: number
  foreign_currency_code: string
  exchange_rate: number
  logistics_costs: number
  taxes: number
  nationalization_costs: number
  status: string
  start_date: string
  expected_arrival_date?: string
  actual_arrival_date?: string
  created_at?: string
  updated_at?: string
}

export interface ImportBatchSummary {
  success: boolean
  batch_id: string
  total_rows: number
  imported_rows: number
  rejected_rows: number
  imported_amount: number
  total_amount: number
  rejected_amount: number
  total_value?: number
  rejected_value?: number
}

export interface ImportReject {
  id: string
  row_number: number
  reason: string
  raw_data: any
}
