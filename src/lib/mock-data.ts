import {
  Transaction,
  KPI,
  DailyBalance,
  Alert,
  Log,
  CashFlowEntry,
  Receivable,
  BankBalance,
  HistoricalBalance,
} from './types'
import { addDays, subDays, format, isWeekend } from 'date-fns'

export const generateDailyBalances = (days: number = 30): DailyBalance[] => {
  const data: DailyBalance[] = []
  let currentBalance = 50000

  // Past 7 days
  for (let i = 7; i > 0; i--) {
    const date = subDays(new Date(), i)
    const inflow = Math.random() * 10000
    const outflow = Math.random() * 8000
    const net = inflow - outflow
    currentBalance += net
    data.push({
      date: format(date, 'yyyy-MM-dd'),
      closing_balance: parseFloat(currentBalance.toFixed(2)),
      is_projected: false,
      total_inflows: parseFloat(inflow.toFixed(2)),
      total_outflows: parseFloat(outflow.toFixed(2)),
      net_flow: parseFloat(net.toFixed(2)),
    })
  }

  // Future 30 days
  for (let i = 0; i < days; i++) {
    const date = addDays(new Date(), i)
    const inflow = Math.random() * 12000
    const outflow = Math.random() * 10000
    const net = inflow - outflow
    currentBalance += net
    data.push({
      date: format(date, 'yyyy-MM-dd'),
      closing_balance: parseFloat(currentBalance.toFixed(2)),
      is_projected: true,
      total_inflows: parseFloat(inflow.toFixed(2)),
      total_outflows: parseFloat(outflow.toFixed(2)),
      net_flow: parseFloat(net.toFixed(2)),
    })
  }
  return data
}

export const generateCashFlowData = (days: number = 30): CashFlowEntry[] => {
  const data: CashFlowEntry[] = []
  let accumulatedBalance = 50000
  const startDate = subDays(new Date(), 5)

  for (let i = 0; i < days + 5; i++) {
    const date = addDays(startDate, i)
    const total_receivables = Math.random() * 15000 + 5000
    const total_payables = Math.random() * 12000 + 4000
    const imports = Math.random() > 0.7 ? Math.random() * 5000 : 0
    const other_expenses = Math.random() * 1000

    const opening_balance = accumulatedBalance
    const daily_balance =
      total_receivables - total_payables - imports - other_expenses
    accumulatedBalance = opening_balance + daily_balance

    const has_alert = accumulatedBalance < 0
    const alert_message = has_alert ? 'Saldo negativo projetado' : undefined

    data.push({
      date: format(date, 'yyyy-MM-dd'),
      opening_balance: parseFloat(opening_balance.toFixed(2)),
      total_receivables: parseFloat(total_receivables.toFixed(2)),
      total_payables: parseFloat(total_payables.toFixed(2)),
      imports: parseFloat(imports.toFixed(2)),
      other_expenses: parseFloat(other_expenses.toFixed(2)),
      daily_balance: parseFloat(daily_balance.toFixed(2)),
      accumulated_balance: parseFloat(accumulatedBalance.toFixed(2)),
      notes: Math.random() > 0.8 ? 'Revisar lançamentos' : undefined,
      has_alert,
      alert_message,
      is_projected: i >= 5,
      is_weekend: isWeekend(date),
    })
  }

  return data
}

export const mockReceivables: Receivable[] = Array.from({ length: 20 }).map(
  (_, i) => {
    const principal = Math.random() * 5000 + 1000
    const fine = Math.random() > 0.7 ? principal * 0.02 : 0
    const interest = Math.random() > 0.7 ? principal * 0.01 : 0
    const total = principal + fine + interest

    return {
      id: `REC-${i + 1}`,
      company: 'Hospcom Matriz',
      issue_date: format(
        subDays(new Date(), Math.floor(Math.random() * 30)),
        'yyyy-MM-dd',
      ),
      order_number: `PED-${1000 + i}`,
      invoice_number: `NF-${5000 + i}`,
      title_status: Math.random() > 0.3 ? 'Aberto' : 'Liquidado',
      code: `CLI-${100 + i}`,
      customer: `Cliente Exemplo ${i + 1} Ltda`,
      customer_doc: '12.345.678/0001-90',
      state: 'SP',
      regional: 'Sudeste',
      salesperson: 'João Vendedor',
      installment: '1/3',
      due_date: format(
        addDays(new Date(), Math.floor(Math.random() * 30) - 10),
        'yyyy-MM-dd',
      ),
      days_overdue: 0,
      principal_value: parseFloat(principal.toFixed(2)),
      fine: parseFloat(fine.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      updated_value: parseFloat(total.toFixed(2)),
      utilization: 0,
      is_negative: false,
      payment_prediction: format(
        addDays(new Date(), Math.floor(Math.random() * 30)),
        'yyyy-MM-dd',
      ),
    }
  },
)

export const mockBankBalances: BankBalance[] = [
  {
    id: '1',
    date: format(new Date(), 'yyyy-MM-dd'),
    bank_name: 'Banco Itaú',
    account_number: '1234-5',
    balance: 45000.0,
    status: 'draft',
  },
  {
    id: '2',
    date: format(new Date(), 'yyyy-MM-dd'),
    bank_name: 'Banco Santander',
    account_number: '9876-2',
    balance: 12500.5,
    status: 'draft',
  },
  {
    id: '3',
    date: format(new Date(), 'yyyy-MM-dd'),
    bank_name: 'Caixa Econômica',
    account_number: '4567-8',
    balance: 5000.0,
    status: 'draft',
  },
]

export const mockHistoricalBalances: HistoricalBalance[] = Array.from({
  length: 10,
}).map((_, i) => ({
  id: `HIST-${i}`,
  date: format(subDays(new Date(), i + 1), 'yyyy-MM-dd'),
  consolidated_balance: Math.random() * 50000 + 20000,
  user_name: 'João Silva',
  timestamp: format(subDays(new Date(), i + 1), 'yyyy-MM-dd HH:mm'),
}))

export const mockKPIs: KPI = {
  pmr: 25,
  pmp: 42,
  cash_gap: -17,
  days_until_zero: 45,
}

export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'funding',
    severity: 'high',
    message: 'Projeção de caixa negativo em 15 dias',
    date: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    amount: -5000,
  },
  {
    id: '2',
    type: 'receivable_overdue',
    severity: 'medium',
    message: '5 faturas vencidas aguardando ação',
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 12500,
  },
]

export const mockTransactions: Transaction[] = [
  {
    id: '3',
    document_number: 'FAT-500',
    entity_name: 'AWS Services',
    issue_date: '2024-05-05',
    due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    principal_value: 1200,
    fine: 0,
    interest: 0,
    amount: 1200,
    category: 'Infraestrutura',
    status: 'pending',
    type: 'payable',
  },
  {
    id: '4',
    document_number: 'FAT-501',
    entity_name: 'Office Supplies Inc',
    issue_date: '2024-05-01',
    due_date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
    principal_value: 400,
    fine: 25,
    interest: 25,
    amount: 450,
    category: 'Material de Escritório',
    status: 'overdue',
    type: 'payable',
  },
]

export const mockLogs: Log[] = [
  {
    id: '1',
    timestamp: '2024-05-20 10:30:00',
    user_id: 'u1',
    user_name: 'Ana Silva',
    action: 'Login',
    entity_affected: 'Auth',
    result: 'success',
  },
  {
    id: '2',
    timestamp: '2024-05-20 10:35:12',
    user_id: 'u1',
    user_name: 'Ana Silva',
    action: 'Create Transaction',
    entity_affected: 'Receivables',
    result: 'success',
    details: 'Created NF-1004',
  },
]
