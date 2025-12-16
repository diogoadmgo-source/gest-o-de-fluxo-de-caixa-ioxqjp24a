import { Transaction, KPI, DailyBalance, Alert, Log } from './types'
import { addDays, subDays, format } from 'date-fns'

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
  {
    id: '3',
    type: 'payable_overdue',
    severity: 'low',
    message: '2 contas a pagar vencendo hoje',
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 3200,
  },
]

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    document_number: 'NF-1001',
    entity_name: 'Tech Solutions Ltda',
    issue_date: '2024-05-01',
    due_date: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    amount: 15000,
    net_amount: 14500,
    category: 'Serviços',
    status: 'overdue',
    type: 'receivable',
  },
  {
    id: '2',
    document_number: 'NF-1002',
    entity_name: 'Global Corp',
    issue_date: '2024-05-10',
    due_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    amount: 8500,
    net_amount: 8200,
    category: 'Produtos',
    status: 'pending',
    type: 'receivable',
  },
  {
    id: '3',
    document_number: 'FAT-500',
    entity_name: 'AWS Services',
    issue_date: '2024-05-05',
    due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
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
    amount: 450,
    category: 'Material de Escritório',
    status: 'overdue',
    type: 'payable',
  },
  {
    id: '5',
    document_number: 'NF-1003',
    entity_name: 'Consultoria XYZ',
    issue_date: '2024-05-15',
    due_date: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    amount: 5000,
    net_amount: 4800,
    category: 'Consultoria',
    status: 'pending',
    type: 'receivable',
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
  {
    id: '3',
    timestamp: '2024-05-20 11:05:00',
    user_id: 'u2',
    user_name: 'Carlos Santos',
    action: 'Export Report',
    entity_affected: 'Reports',
    result: 'success',
  },
]
