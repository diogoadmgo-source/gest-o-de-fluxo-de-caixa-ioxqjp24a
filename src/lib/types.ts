export type TransactionStatus =
  | 'pending'
  | 'paid'
  | 'received'
  | 'overdue'
  | 'cancelled'

export interface Transaction {
  id: string
  document_number: string
  entity_name: string // customer or supplier
  entity_document?: string
  issue_date: string
  due_date: string
  amount: number
  net_amount?: number // for receivables
  category: string
  status: TransactionStatus
  type: 'receivable' | 'payable'
  payment_method?: string
  notes?: string
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
  receivables: number
  payables: number
  imports: number
  other_expenses: number
  daily_balance: number
  accumulated_balance: number
  notes?: string
  has_alert?: boolean
  alert_message?: string
  is_projected?: boolean
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
