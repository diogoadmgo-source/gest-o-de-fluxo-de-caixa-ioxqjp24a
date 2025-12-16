import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import {
  CashFlowEntry,
  Receivable,
  Transaction,
  BankBalance,
  DailyBalance,
} from '@/lib/types'
import {
  generateCashFlowData,
  mockReceivables,
  mockTransactions,
  mockBankBalances,
} from '@/lib/mock-data'
import {
  addDays,
  format,
  isSameDay,
  parseISO,
  isAfter,
  startOfDay,
} from 'date-fns'

interface CashFlowContextType {
  receivables: Receivable[]
  payables: Transaction[]
  bankBalances: BankBalance[]
  cashFlowEntries: CashFlowEntry[]
  addReceivable: (receivable: Receivable) => void
  updateReceivable: (receivable: Receivable) => void
  deleteReceivable: (id: string) => void
  addPayable: (payable: Transaction) => void
  updatePayable: (payable: Transaction) => void
  deletePayable: (id: string) => void
  updateBankBalances: (balances: BankBalance[]) => void
  importData: (type: 'receivable' | 'payable', data: any[]) => void
  recalculateCashFlow: () => void
}

const CashFlowContext = createContext<CashFlowContextType | undefined>(
  undefined,
)

export const CashFlowProvider = ({ children }: { children: ReactNode }) => {
  const [receivables, setReceivables] = useState<Receivable[]>(mockReceivables)
  const [payables, setPayables] = useState<Transaction[]>(
    mockTransactions.filter((t) => t.type === 'payable'),
  )
  const [bankBalances, setBankBalances] =
    useState<BankBalance[]>(mockBankBalances)
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([])

  // Initialize Cash Flow Data (90 days)
  useEffect(() => {
    const initialData = generateCashFlowData(90)
    setCashFlowEntries(initialData)
  }, [])

  // Recalculate Cash Flow whenever dependencies change
  useEffect(() => {
    if (cashFlowEntries.length > 0) {
      performRecalculation()
    }
  }, [receivables, payables, bankBalances])

  const performRecalculation = () => {
    const sortedEntries = [...cashFlowEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    let currentAccumulated = 0

    const newEntries = sortedEntries.map((entry, index) => {
      const entryDate = parseISO(entry.date)

      // 1. Calculate Daily Totals from Receivables and Payables
      const dayReceivables = receivables
        .filter((r) => isSameDay(parseISO(r.due_date), entryDate))
        .reduce((sum, r) => sum + r.updated_value, 0) // Updated Value used (Principal + Fine + Interest)

      const dayPayables = payables
        .filter((p) => isSameDay(parseISO(p.due_date), entryDate))
        .reduce((sum, p) => sum + p.amount, 0) // Amount is Updated Value

      // 2. Check for Manual Balance Override (Integration of Balances)
      const dayBalances = bankBalances.filter((b) =>
        isSameDay(parseISO(b.date), entryDate),
      )

      const manualBalanceSum = dayBalances.reduce(
        (sum, b) => sum + b.balance,
        0,
      )
      const hasManualBalance = dayBalances.length > 0

      // 3. Determine Opening Balance
      let openingBalance = 0
      if (index === 0) {
        openingBalance = hasManualBalance
          ? manualBalanceSum
          : entry.opening_balance
      } else {
        openingBalance = hasManualBalance
          ? manualBalanceSum
          : currentAccumulated
      }

      // 4. Calculate Daily Balance
      const dailyBalance =
        dayReceivables - dayPayables - entry.imports - entry.other_expenses

      // 5. Calculate Accumulated
      const accumulatedBalance = openingBalance + dailyBalance
      currentAccumulated = accumulatedBalance

      return {
        ...entry,
        opening_balance: openingBalance,
        total_receivables: dayReceivables,
        total_payables: dayPayables,
        daily_balance: dailyBalance,
        accumulated_balance: accumulatedBalance,
        has_alert: accumulatedBalance < 0,
        alert_message:
          accumulatedBalance < 0 ? 'Saldo negativo projetado' : undefined,
      }
    })

    setCashFlowEntries(newEntries)
  }

  const addReceivable = (receivable: Receivable) => {
    setReceivables((prev) => [...prev, receivable])
  }

  const updateReceivable = (updated: Receivable) => {
    setReceivables((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    )
  }

  const deleteReceivable = (id: string) => {
    setReceivables((prev) => prev.filter((r) => r.id !== id))
  }

  const addPayable = (payable: Transaction) => {
    setPayables((prev) => [...prev, payable])
  }

  const updatePayable = (updated: Transaction) => {
    setPayables((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const deletePayable = (id: string) => {
    setPayables((prev) => prev.filter((p) => p.id !== id))
  }

  const updateBankBalances = (newBalances: BankBalance[]) => {
    const datesToUpdate = new Set(newBalances.map((b) => b.date))

    setBankBalances((prev) => {
      const filtered = prev.filter((b) => !datesToUpdate.has(b.date))
      return [...filtered, ...newBalances]
    })
  }

  const importData = (type: 'receivable' | 'payable', data: any[]) => {
    if (type === 'receivable') {
      const newReceivables = data.map((d, i) => {
        const principal = Number(d.principal_value) || Number(d.amount) || 0
        const fine = Number(d.fine) || 0
        const interest = Number(d.interest) || 0

        return {
          ...mockReceivables[0],
          id: `IMP-REC-${Date.now()}-${i}`,
          principal_value: principal,
          fine: fine,
          interest: interest,
          updated_value: principal + fine + interest,
          ...d,
        }
      })
      setReceivables((prev) => [...prev, ...newReceivables])
    } else {
      const newPayables = data.map((d, i) => {
        const principal = Number(d.principal_value) || Number(d.amount) || 0
        const fine = Number(d.fine) || 0
        const interest = Number(d.interest) || 0

        return {
          ...mockTransactions[0],
          id: `IMP-PAY-${Date.now()}-${i}`,
          type: 'payable' as const,
          principal_value: principal,
          fine: fine,
          interest: interest,
          amount: principal + fine + interest,
          ...d,
        }
      })
      setPayables((prev) => [...prev, ...newPayables])
    }
  }

  const recalculateCashFlow = () => {
    performRecalculation()
  }

  return (
    <CashFlowContext.Provider
      value={{
        receivables,
        payables,
        bankBalances,
        cashFlowEntries,
        addReceivable,
        updateReceivable,
        deleteReceivable,
        addPayable,
        updatePayable,
        deletePayable,
        updateBankBalances,
        importData,
        recalculateCashFlow,
      }}
    >
      {children}
    </CashFlowContext.Provider>
  )
}

export default function useCashFlowStore() {
  const context = useContext(CashFlowContext)
  if (context === undefined) {
    throw new Error('useCashFlowStore must be used within a CashFlowProvider')
  }
  return context
}
