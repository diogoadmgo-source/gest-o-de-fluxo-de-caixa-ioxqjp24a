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

// New specific type for Accounts Receivable matching the requirements
export interface Receivable {
  id: string
  company: string // Empresa
  issue_date: string // Data de Emissão
  order_number: string // Nr do Pedido
  invoice_number: string // NF
  title_status: string // Status do Título
  code: string // Código
  customer: string // Cliente
  customer_doc: string // CNPJ/CPF
  state: string // UF
  regional: string // Regional
  salesperson: string // Vendedor
  installment: string // Parcela
  due_date: string // Dt. Vencimento
  days_overdue: number // Dias
  principal_value: number // Vlr Principal
  fine: number // Multa
  interest: number // Juros
  updated_value: number // Vlr Atualizado
  utilization: number // Utilização
  is_negative: boolean // Negativado
  payment_prediction: string // Previsão de Pgto.
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
  total_receivables: number // Total a Receber
  total_payables: number // Total a Pagar
  imports: number // Importações
  other_expenses: number // Outras Despesas
  daily_balance: number // Saldo do Dia
  accumulated_balance: number // Saldo Acumulado
  notes?: string
  has_alert?: boolean
  alert_message?: string
  is_projected?: boolean
  is_weekend?: boolean
}

export interface BankBalance {
  id: string
  date: string
  bank_name: string
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
