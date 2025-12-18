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
  KPI,
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
  getDashboardKPIs,
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
  kpis: KPI | null

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
  const [kpis, setKpis] = useState<KPI | null>(null)

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
    queryClient.invalidate('payables')
    queryClient.invalidate('dashboard')
  }

  const fetchData = useCallback(async () => {
    if (!user) return
    if (cashFlowEntries.length === 0) setLoading(true)

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
        .from('bank_balances')
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

        // Fetch Aggregates
        const aggs = await getCashFlowAggregates(selectedCompanyId, start, end)

        // Fetch KPIs
        const kpiData = await getDashboardKPIs(selectedCompanyId)
        setKpis(kpiData as KPI)

        let currentBalance = 0
        const latestBalances = new Map<string, number>()
        // Calculate initial balance from the latest available balance for each bank
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
        setKpis(null)
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

    // Real-time subscriptions
    if (selectedCompanyId && selectedCompanyId !== 'all') {
      const channel = supabase
        .channel('cash-flow-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'receivables',
            filter: `company_id=eq.${selectedCompanyId}`,
          },
          () => fetchData(),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `company_id=eq.${selectedCompanyId}`,
          },
          () => fetchData(),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payables',
            filter: `company_id=eq.${selectedCompanyId}`,
          },
          () => fetchData(),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bank_balances',
            filter: `company_id=eq.${selectedCompanyId}`,
          },
          () => fetchData(),
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchData, selectedCompanyId])

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
    queryClient.invalidate('payables')
    fetchData()
  }
  const updatePayable = async (p: Transaction) => {
    if (user) await salvarPayableManual(p, user.id)
    queryClient.invalidate('payables')
    fetchData()
  }
  const deletePayable = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id)
    queryClient.invalidate('payables')
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

    onProgress?.(10)

    let result
    // Pass user.id and optional fallback company
    const fallback =
      selectedCompanyId && selectedCompanyId !== 'all'
        ? selectedCompanyId
        : undefined

    if (type === 'receivable') {
      result = await importarReceivables(
        user.id,
        data,
        fallback,
        filename || 'import.csv',
      )
      queryClient.invalidate('receivables')
    } else {
      result = await importarPayables(user.id, data, fallback)
      queryClient.invalidate('payables')
    }

    onProgress?.(90)

    // Note: Logging logic for rejected rows is handled within the new RPC/Service
    // We can still log a generic entry to legacy table if desired, or rely on new tables
    // For now, keeping legacy behavior as supplement
    if (result.success) {
      const logCompanyId = fallback || (companies[0] ? companies[0].id : null)

      if (logCompanyId) {
        await supabase.from('import_logs').insert({
          company_id: logCompanyId,
          user_id: user.id,
          filename: filename || 'manual_import.csv',
          type: type,
          status: 'success',
          total_records: result.stats?.records || 0,
          success_count: result.stats?.records || 0,
          error_count: result.failures?.length || 0,
          deleted_count: 0,
        })
      }

      queryClient.invalidate('dashboard')
      fetchData()
    }
    return result
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
        kpis,
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
