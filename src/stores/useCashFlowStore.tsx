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
  Bank,
  ImportHistoryEntry,
  Company,
} from '@/lib/types'
import {
  generateCashFlowData,
  mockReceivables,
  mockTransactions,
  mockBankBalances,
  mockCompanies,
} from '@/lib/mock-data'
import { isSameDay, parseISO } from 'date-fns'

interface CashFlowContextType {
  companies: Company[]
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string | null) => void

  // These are now FILTERED based on selectedCompanyId
  receivables: Receivable[]
  payables: Transaction[]
  bankBalances: BankBalance[]
  cashFlowEntries: CashFlowEntry[]
  banks: Bank[]

  importHistory: ImportHistoryEntry[]

  addReceivable: (receivable: Receivable) => void
  updateReceivable: (receivable: Receivable) => void
  deleteReceivable: (id: string) => void

  addPayable: (payable: Transaction) => void
  updatePayable: (payable: Transaction) => void
  deletePayable: (id: string) => void

  updateBankBalances: (balances: BankBalance[]) => void
  resetBalanceHistory: () => void

  addBank: (bank: Bank) => void
  updateBank: (bank: Bank) => void
  deleteBank: (id: string) => void

  importData: (
    type: 'receivable' | 'payable',
    data: any[],
    filename?: string,
  ) => void
  clearImportHistory: () => void
  recalculateCashFlow: () => void
}

const CashFlowContext = createContext<CashFlowContextType | undefined>(
  undefined,
)

const initialBanks: Bank[] = [
  {
    id: '1',
    company_id: 'c1',
    name: 'Itaú Principal',
    institution: 'Banco Itaú',
    agency: '1234',
    account_number: '12345',
    account_digit: '5',
    active: true,
    type: 'bank',
  },
  {
    id: '2',
    company_id: 'c2',
    name: 'Santander Movimento',
    institution: 'Banco Santander',
    agency: '4321',
    account_number: '98765',
    account_digit: '2',
    active: true,
    type: 'bank',
  },
  {
    id: '3',
    company_id: 'c3',
    name: 'Caixa Reserva',
    institution: 'Caixa Econômica',
    agency: '5678',
    account_number: '45678',
    account_digit: '8',
    active: true,
    type: 'bank',
  },
  {
    id: '4',
    company_id: 'c1',
    name: 'Cofre Escritório',
    institution: 'Caixa Físico',
    agency: '-',
    account_number: '-',
    account_digit: '',
    active: true,
    type: 'cash',
  },
]

const STORAGE_KEYS = {
  RECEIVABLES: 'hospcash_receivables',
  PAYABLES: 'hospcash_payables',
  BANK_BALANCES: 'hospcash_bankBalances',
  BANKS: 'hospcash_banks',
  CASH_FLOW_ENTRIES: 'hospcash_entries',
  IMPORT_HISTORY: 'hospcash_importHistory',
  COMPANIES: 'hospcash_companies',
  SELECTED_COMPANY: 'hospcash_selectedCompany',
}

export const CashFlowProvider = ({ children }: { children: ReactNode }) => {
  // --- Company State ---
  const [companies, setCompanies] = useState<Company[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.COMPANIES)
    return stored ? JSON.parse(stored) : mockCompanies
  })

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    () => {
      return localStorage.getItem(STORAGE_KEYS.SELECTED_COMPANY) || null
    },
  )

  // --- Data State (All Data) ---
  const [allReceivables, setAllReceivables] = useState<Receivable[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.RECEIVABLES)
    return stored ? JSON.parse(stored) : mockReceivables
  })

  const [allPayables, setAllPayables] = useState<Transaction[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PAYABLES)
    return stored
      ? JSON.parse(stored)
      : mockTransactions.filter((t) => t.type === 'payable')
  })

  const [allBankBalances, setAllBankBalances] = useState<BankBalance[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.BANK_BALANCES)
    return stored ? JSON.parse(stored) : mockBankBalances
  })

  const [allBanks, setAllBanks] = useState<Bank[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.BANKS)
    return stored ? JSON.parse(stored) : initialBanks
  })

  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>(
    () => {
      const stored = localStorage.getItem(STORAGE_KEYS.CASH_FLOW_ENTRIES)
      return stored ? JSON.parse(stored) : []
    },
  )

  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>(
    () => {
      const stored = localStorage.getItem(STORAGE_KEYS.IMPORT_HISTORY)
      return stored
        ? JSON.parse(stored)
        : [
            {
              id: '1',
              date: new Date().toISOString(),
              filename: 'importacao_inicial.csv',
              type: 'receivable',
              status: 'success',
              records_count: 20,
              user_name: 'Sistema',
            },
          ]
    },
  )

  // --- Persistence Effects ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies))
  }, [companies])

  useEffect(() => {
    if (selectedCompanyId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_COMPANY, selectedCompanyId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_COMPANY)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.RECEIVABLES,
      JSON.stringify(allReceivables),
    )
  }, [allReceivables])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYABLES, JSON.stringify(allPayables))
  }, [allPayables])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.BANK_BALANCES,
      JSON.stringify(allBankBalances),
    )
  }, [allBankBalances])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(allBanks))
  }, [allBanks])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.CASH_FLOW_ENTRIES,
      JSON.stringify(cashFlowEntries),
    )
  }, [cashFlowEntries])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.IMPORT_HISTORY,
      JSON.stringify(importHistory),
    )
  }, [importHistory])

  // --- Initialization ---
  useEffect(() => {
    if (cashFlowEntries.length === 0) {
      const initialData = generateCashFlowData(90)
      setCashFlowEntries(initialData)
    }
  }, [])

  // --- Derived State (Filtering) ---
  const receivables = selectedCompanyId
    ? allReceivables.filter((r) => r.company_id === selectedCompanyId)
    : allReceivables

  const payables = selectedCompanyId
    ? allPayables.filter((p) => p.company_id === selectedCompanyId)
    : allPayables

  const bankBalances = selectedCompanyId
    ? allBankBalances.filter((b) => b.company_id === selectedCompanyId)
    : allBankBalances

  const banks = selectedCompanyId
    ? allBanks.filter((b) => b.company_id === selectedCompanyId)
    : allBanks

  // --- Recalculation ---
  useEffect(() => {
    // We only recalculate using the currently filtered views or ALL?
    // User Story says: "Application-Wide Data Filtering: All data... must automatically update"
    // So the CashFlowEntries should be recalculated based on the FILTERED receivables/payables.
    if (cashFlowEntries.length > 0) {
      performRecalculation()
    }
  }, [allReceivables, allPayables, allBankBalances, selectedCompanyId])

  const performRecalculation = () => {
    // If we use 'cashFlowEntries' state, it is shared.
    // If we filter, we might want to recalculate starting from 0 or just update the values.
    // For simplicity, we re-run logic over the base entries structure but using filtered sums.

    // NOTE: This updates the global 'cashFlowEntries' state which is then used by the UI.
    // So the 'cashFlowEntries' will effectively become "filtered cash flow entries".
    // This is desired behavior.

    const sortedEntries = [...cashFlowEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    let currentAccumulated = 0

    const newEntries = sortedEntries.map((entry, index) => {
      const entryDate = parseISO(entry.date)

      // 1. Calculate Daily Totals using FILTERED data
      const dayReceivables = receivables
        .filter(
          (r) =>
            isSameDay(parseISO(r.due_date), entryDate) &&
            r.title_status === 'Aberto',
        )
        .reduce((sum, r) => sum + r.updated_value, 0)

      const dayPayables = payables
        .filter(
          (p) =>
            isSameDay(parseISO(p.due_date), entryDate) &&
            p.status !== 'paid' &&
            p.status !== 'cancelled',
        )
        .reduce((sum, p) => sum + p.amount, 0)

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
        openingBalance = entry.opening_balance
      } else {
        openingBalance = currentAccumulated
      }

      // 4. Calculate Daily Balance (Net Flow)
      const dailyBalance =
        dayReceivables - dayPayables - entry.imports - entry.other_expenses

      // 5. Calculate Accumulated Balance
      let accumulatedBalance = openingBalance + dailyBalance

      if (hasManualBalance) {
        accumulatedBalance = manualBalanceSum
      }

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

  // --- Actions ---
  const addReceivable = (receivable: Receivable) => {
    // If creating a receivable and a company is selected, ensure it has the ID
    const newItem = {
      ...receivable,
      company_id: receivable.company_id || selectedCompanyId || undefined,
    }
    setAllReceivables((prev) => [...prev, newItem])
  }

  const updateReceivable = (updated: Receivable) => {
    setAllReceivables((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    )
  }

  const deleteReceivable = (id: string) => {
    setAllReceivables((prev) => prev.filter((r) => r.id !== id))
  }

  const addPayable = (payable: Transaction) => {
    const newItem = {
      ...payable,
      company_id: payable.company_id || selectedCompanyId || undefined,
    }
    setAllPayables((prev) => [...prev, newItem])
  }

  const updatePayable = (updated: Transaction) => {
    setAllPayables((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    )
  }

  const deletePayable = (id: string) => {
    setAllPayables((prev) => prev.filter((p) => p.id !== id))
  }

  const updateBankBalances = (newBalances: BankBalance[]) => {
    // When saving balances, we are saving for the filtered view?
    // If global filter is ON, we are saving balances for that company.
    // The `newBalances` should probably have company_id attached.

    const balancesWithCompany = newBalances.map((b) => ({
      ...b,
      company_id: b.company_id || selectedCompanyId || undefined,
    }))

    const datesToUpdate = new Set(balancesWithCompany.map((b) => b.date))

    setAllBankBalances((prev) => {
      // Remove balances matching date AND company (if selected) or just date (if no filter?)
      // To be safe, we only replace balances for the active view context
      // But simplifying: replace by ID if possible, or filter logic

      // Strategy: Remove all balances for these dates that match the current filter scope
      // Then add the new ones.

      const filtered = prev.filter((b) => {
        const isDateMatch = datesToUpdate.has(b.date)
        const isCompanyMatch = selectedCompanyId
          ? b.company_id === selectedCompanyId
          : true
        // If it matches date AND context, remove it (we will replace it)
        return !(isDateMatch && isCompanyMatch)
      })

      return [...filtered, ...balancesWithCompany]
    })
  }

  const resetBalanceHistory = () => {
    if (selectedCompanyId) {
      setAllBankBalances((prev) =>
        prev.filter((b) => b.company_id !== selectedCompanyId),
      )
    } else {
      setAllBankBalances([])
    }
  }

  const addBank = (bank: Bank) => {
    const newItem = {
      ...bank,
      company_id: bank.company_id || selectedCompanyId || undefined,
    }
    setAllBanks((prev) => [...prev, newItem])
  }

  const updateBank = (updated: Bank) => {
    setAllBanks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }

  const deleteBank = (id: string) => {
    setAllBanks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: false } : b)),
    )
  }

  const importData = (
    type: 'receivable' | 'payable',
    data: any[],
    filename: string = 'import.csv',
  ) => {
    // Extract unique companies from import data if present
    // Assuming data might have 'company' or 'empresa' field
    const newCompanyNames = new Set<string>()

    data.forEach((d) => {
      if (d.company) newCompanyNames.add(d.company)
      if (d.empresa) newCompanyNames.add(d.empresa)
    })

    // Create new companies if they don't exist
    const updatedCompanies = [...companies]
    let companiesChanged = false

    newCompanyNames.forEach((name) => {
      if (!updatedCompanies.find((c) => c.name === name)) {
        updatedCompanies.push({
          id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: name,
        })
        companiesChanged = true
      }
    })

    if (companiesChanged) {
      setCompanies(updatedCompanies)
    }

    // Process Import
    if (type === 'receivable') {
      const newReceivables = data.map((d, i) => {
        const principal = Number(d.principal_value) || Number(d.amount) || 0
        const fine = Number(d.fine) || 0
        const interest = Number(d.interest) || 0

        // Find company ID if possible
        const companyName = d.company || d.empresa
        const companyId = companyName
          ? updatedCompanies.find((c) => c.name === companyName)?.id
          : selectedCompanyId

        return {
          ...mockReceivables[0],
          id: `IMP-REC-${Date.now()}-${i}`,
          principal_value: principal,
          fine: fine,
          interest: interest,
          updated_value: principal + fine + interest,
          company_id: companyId,
          ...d,
        }
      })
      setAllReceivables((prev) => [...prev, ...newReceivables])

      setImportHistory((prev) => [
        {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          filename,
          type: 'receivable',
          status: 'success',
          records_count: newReceivables.length,
          user_name: 'Usuário Atual',
        },
        ...prev,
      ])
    } else {
      const newPayables = data.map((d, i) => {
        const principal = Number(d.principal_value) || Number(d.amount) || 0
        const fine = Number(d.fine) || 0
        const interest = Number(d.interest) || 0

        // Find company ID if possible
        const companyName = d.company || d.empresa
        const companyId = companyName
          ? updatedCompanies.find((c) => c.name === companyName)?.id
          : selectedCompanyId

        return {
          ...mockTransactions[0],
          id: `IMP-PAY-${Date.now()}-${i}`,
          type: 'payable' as const,
          principal_value: principal,
          fine: fine,
          interest: interest,
          amount: principal + fine + interest,
          company_id: companyId,
          ...d,
        }
      })
      setAllPayables((prev) => [...prev, ...newPayables])

      setImportHistory((prev) => [
        {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          filename,
          type: 'payable',
          status: 'success',
          records_count: newPayables.length,
          user_name: 'Usuário Atual',
        },
        ...prev,
      ])
    }
  }

  const clearImportHistory = () => {
    setImportHistory([])
  }

  const recalculateCashFlow = () => {
    performRecalculation()
  }

  return (
    <CashFlowContext.Provider
      value={{
        companies,
        selectedCompanyId,
        setSelectedCompanyId,
        receivables,
        payables,
        bankBalances,
        cashFlowEntries,
        banks,
        importHistory,
        addReceivable,
        updateReceivable,
        deleteReceivable,
        addPayable,
        updatePayable,
        deletePayable,
        updateBankBalances,
        resetBalanceHistory,
        addBank,
        updateBank,
        deleteBank,
        importData,
        clearImportHistory,
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
