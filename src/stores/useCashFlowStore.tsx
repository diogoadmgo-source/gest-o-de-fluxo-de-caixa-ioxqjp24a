import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import {
  CashFlowEntry,
  Receivable,
  Transaction,
  BankBalance,
  Bank,
  Company,
  Payable,
  FinancialAdjustment,
  ImportHistoryEntry,
} from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  getCashFlowAggregates,
  salvarReceivableManual,
  salvarPayableManual,
  salvarBankManual,
  salvarImportLogManual,
  importarReceivables,
  importarPayables,
} from '@/services/financial'
import { normalizeCompanyId } from '@/lib/utils'
import { subDays, addDays } from 'date-fns'
import { queryClient } from '@/lib/query-client'

interface CashFlowContextType {
  companies: Company[]
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string | null) => void

  bankBalances: BankBalance[]
  banks: Bank[]
  cashFlowEntries: CashFlowEntry[]

  receivables: Receivable[]
  payables: Transaction[]
  accountPayables: Payable[]
  adjustments: FinancialAdjustment[]
  importHistory: ImportHistoryEntry[]

  addReceivable: (receivable: Receivable) => Promise<void>
  updateReceivable: (receivable: Receivable) => Promise<void>
  deleteReceivable: (id: string) => Promise<void>

  addPayable: (payable: Transaction) => Promise<void>
  updatePayable: (payable: Transaction) => Promise<void>
  deletePayable: (id: string) => Promise<void>

  addBank: (bank: Bank) => Promise<{ data?: Bank; error?: any }>
  updateBank: (bank: Bank) => Promise<void>
  deleteBank: (id: string) => Promise<void>

  updateBankBalances: (balances: BankBalance[]) => void
  resetBalanceHistory: () => void

  importData: (
    type: 'receivable' | 'payable',
    data: any[],
    filename?: string,
    onProgress?: (percent: number) => void,
  ) => Promise<any>
  addImportLog: (log: ImportHistoryEntry) => Promise<void>
  updateImportLog: (log: ImportHistoryEntry) => Promise<void>
  deleteImportLog: (id: string) => Promise<void>

  recalculateCashFlow: () => void
  loading: boolean
}

const CashFlowContext = createContext<CashFlowContextType | undefined>(
  undefined,
)

export const CashFlowProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedCompanyId, setInternalSelectedCompanyId] = useState<
    string | null
  >(() => {
    return normalizeCompanyId(localStorage.getItem('hospcash_selectedCompany'))
  })

  const [companies, setCompanies] = useState<Company[]>([])
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([])
  const [bankBalances, setBankBalances] = useState<BankBalance[]>([])
  const [banks, setBanks] = useState<Bank[]>([])

  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [payables, setPayables] = useState<Transaction[]>([])
  const [accountPayables, setAccountPayables] = useState<Payable[]>([])
  const [adjustments, setAdjustments] = useState<FinancialAdjustment[]>([])
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([])

  const setSelectedCompanyId = (id: string | null) => {
    const norm = normalizeCompanyId(id)
    setInternalSelectedCompanyId(norm)
    if (norm) localStorage.setItem('hospcash_selectedCompany', norm)
    else localStorage.removeItem('hospcash_selectedCompany')
    queryClient.invalidate('cashflow')
    queryClient.invalidate('receivables')
    queryClient.invalidate('dashboard')
  }

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: userCompanies } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
      const ids = userCompanies?.map((c) => c.company_id) || []

      if (ids.length > 0) {
        const { data: comps } = await supabase
          .from('companies')
          .select('*')
          .in('id', ids)
          .order('name')
        setCompanies((comps as Company[]) || [])
      }

      const visibleIds =
        selectedCompanyId && selectedCompanyId !== 'all'
          ? [selectedCompanyId]
          : ids
      if (visibleIds.length === 0) return

      const { data: banksData } = await supabase
        .from('banks')
        .select('*')
        .in('company_id', visibleIds)
        .eq('active', true)
      setBanks((banksData as Bank[]) || [])

      const { data: balData } = await supabase
        .from('bank_balances_v2')
        .select('*, banks(name, account_number)')
        .in('company_id', visibleIds)
        .order('reference_date', { ascending: false })
        .limit(100)

      if (balData) {
        setBankBalances(
          balData.map((b: any) => ({
            id: b.id,
            company_id: b.company_id,
            date: b.reference_date,
            bank_name: b.banks?.name || 'Unknown',
            bank_id: b.bank_id,
            account_number: b.banks?.account_number || '',
            balance: b.amount,
            status: 'saved',
          })),
        )
      }

      if (selectedCompanyId && selectedCompanyId !== 'all') {
        const today = new Date()
        const start = subDays(today, 30)
        const end = addDays(today, 90)
        const aggs = await getCashFlowAggregates(selectedCompanyId, start, end)

        let currentBalance = 0
        const latestBalances = new Map<string, number>()
        balData?.forEach((b: any) => {
          if (!latestBalances.has(b.bank_id))
            latestBalances.set(b.bank_id, b.amount)
        })
        currentBalance = Array.from(latestBalances.values()).reduce(
          (a, b) => a + b,
          0,
        )

        const entries = aggs.map((day: any) => {
          const flow = (day.total_receivables || 0) - (day.total_payables || 0)
          return {
            date: day.day,
            opening_balance: 0,
            total_receivables: day.total_receivables,
            total_payables: day.total_payables,
            daily_balance: flow,
            accumulated_balance: 0,
            imports: 0,
            other_expenses: 0,
            adjustments_credit: 0,
            adjustments_debit: 0,
            is_projected: new Date(day.day) > today,
          }
        })

        let running = currentBalance
        const todayStr = today.toISOString().split('T')[0]
        const todayIdx = entries.findIndex((e: any) => e.date === todayStr)

        if (todayIdx >= 0) {
          for (let i = todayIdx; i < entries.length; i++) {
            entries[i].opening_balance = running
            entries[i].accumulated_balance = running + entries[i].daily_balance
            running = entries[i].accumulated_balance
          }
          running = currentBalance
          for (let i = todayIdx - 1; i >= 0; i--) {
            entries[i].accumulated_balance = running
            entries[i].opening_balance = running - entries[i].daily_balance
            running = entries[i].opening_balance
          }
        }

        setCashFlowEntries(entries)
      } else {
        setCashFlowEntries([])
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [user, selectedCompanyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addReceivable = async (r: Receivable) => {
    if (!user) return
    await salvarReceivableManual(r, user.id)
    toast.success('Recebível salvo')
    queryClient.invalidate('receivables')
    fetchData()
  }

  const updateReceivable = async (r: Receivable) => {
    if (!user) return
    await salvarReceivableManual(r, user.id)
    toast.success('Recebível atualizado')
    queryClient.invalidate('receivables')
    fetchData()
  }

  const deleteReceivable = async (id: string) => {
    await supabase.from('receivables').delete().eq('id', id)
    queryClient.invalidate('receivables')
    fetchData()
  }

  const addPayable = async (p: Transaction) => {
    if (user) await salvarPayableManual(p, user.id)
    fetchData()
  }
  const updatePayable = async (p: Transaction) => {
    if (user) await salvarPayableManual(p, user.id)
    fetchData()
  }
  const deletePayable = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id)
    fetchData()
  }

  const addBank = async (b: Bank) => {
    if (!user) return { error: 'No user' }
    return salvarBankManual(b, user.id)
  }
  const updateBank = async (b: Bank) => {
    if (user) await salvarBankManual(b, user.id)
    fetchData()
  }
  const deleteBank = async (id: string) => {
    await supabase.from('banks').delete().eq('id', id)
    fetchData()
  }

  const updateBankBalances = () => fetchData()
  const resetBalanceHistory = async () => {}
  const addImportLog = async (l: ImportHistoryEntry) => {
    if (user) await salvarImportLogManual(l, user.id)
  }
  const updateImportLog = async (l: ImportHistoryEntry) => {
    if (user) await salvarImportLogManual(l, user.id)
  }
  const deleteImportLog = async (id: string) => {
    await supabase.from('import_logs').delete().eq('id', id)
  }

  const importData = async (
    type: 'receivable' | 'payable',
    data: any[],
    filename?: string,
    onProgress?: (percent: number) => void,
  ) => {
    if (!user) throw new Error('User not authenticated')

    // Ensure company is selected
    if (!selectedCompanyId || selectedCompanyId === 'all') {
      throw new Error(
        'Selecione uma empresa específica para realizar a importação.',
      )
    }

    if (type === 'receivable') {
      // Simulate progress for UI feedback
      onProgress?.(10)

      const result = await importarReceivables(selectedCompanyId, data)

      onProgress?.(90)

      // Log the import
      if (result.success) {
        await supabase.from('import_logs').insert({
          company_id: selectedCompanyId,
          user_id: user.id,
          filename: filename || 'manual_import.csv',
          type: 'receivable',
          status: 'success',
          total_records: result.stats.records,
          success_count: result.stats.records,
          error_count: 0,
          deleted_count: 0,
        })

        // Force refresh of all relevant data
        queryClient.invalidate('receivables')
        queryClient.invalidate('dashboard')
        fetchData()
      }
      return result
    }

    return await importarPayables()
  }

  return (
    <CashFlowContext.Provider
      value={{
        companies,
        selectedCompanyId,
        setSelectedCompanyId,
        receivables,
        payables,
        accountPayables,
        bankBalances,
        banks,
        cashFlowEntries,
        adjustments,
        importHistory,
        addReceivable,
        updateReceivable,
        deleteReceivable,
        addPayable,
        updatePayable,
        deletePayable,
        addBank,
        updateBank,
        deleteBank,
        updateBankBalances,
        resetBalanceHistory,
        addImportLog,
        updateImportLog,
        deleteImportLog,
        importData,
        recalculateCashFlow: fetchData,
        loading,
      }}
    >
      {children}
    </CashFlowContext.Provider>
  )
}

export default function useCashFlowStore() {
  const context = useContext(CashFlowContext)
  if (context === undefined)
    throw new Error('useCashFlowStore must be used within a CashFlowProvider')
  return context
}
