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
  getDashboardKPIs,
  getLatestBankBalances,
  salvarBankManual,
  salvarPayableManual,
  deletePayableTransaction,
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
  addBank: (bank: Bank) => Promise<any>
  updateBank: (bank: Bank) => Promise<void>
  deleteBank: (id: string) => Promise<void>
  addPayable: (transaction: Transaction) => Promise<void>
  updatePayable: (transaction: Transaction) => Promise<void>
  deletePayable: (id: string) => Promise<void>
  recalculateCashFlow: () => void
  loading: boolean
  timeframe: number
  setTimeframe: (days: number) => void
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
  const [timeframe, setTimeframe] = useState(30)

  const [companies, setCompanies] = useState<Company[]>([])
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([])
  const [bankBalances, setBankBalances] = useState<BankBalance[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [kpis, setKpis] = useState<KPI | null>(null)

  // Placeholders for legacy arrays, can be populated if needed
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
    queryClient.clear()
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

      const activeId =
        selectedCompanyId && selectedCompanyId !== 'all'
          ? selectedCompanyId
          : null

      // Always fetch data, handling 'all' case by passing null to RPCs

      // 1. Fetch Banks
      // For banks list, if activeId is null, we fetch all banks from allowed companies
      let banksQuery = supabase.from('banks').select('*').eq('active', true)

      if (activeId) {
        banksQuery = banksQuery.eq('company_id', activeId)
      } else if (ids.length > 0) {
        banksQuery = banksQuery.in('company_id', ids)
      } else {
        // No allowed companies, empty banks
        setBanks([])
        setBankBalances([])
        setCashFlowEntries([])
        setKpis(null)
        setLoading(false)
        return
      }

      const { data: banksData } = await banksQuery
      setBanks((banksData as Bank[]) || [])

      // 2. Fetch Latest Balances (Handles null activeId as All Companies)
      const latestBalances = await getLatestBankBalances(activeId)
      setBankBalances(latestBalances)

      // 3. Fetch KPI (Handles null activeId as All Companies)
      const kpiData = await getDashboardKPIs(activeId, timeframe)
      setKpis(kpiData as KPI)

      // 4. Calculate Cash Flow
      const today = new Date()
      // Provide small history context (e.g. 7 days back) + requested timeframe
      const historyDays = Math.min(15, timeframe)
      const start = subDays(today, historyDays)
      const end = addDays(today, timeframe)

      const aggs = await getCashFlowAggregates(activeId, start, end)

      // Initial Balance Sum
      const currentTotalBalance = latestBalances.reduce(
        (acc, b) => acc + (b.balance || 0),
        0,
      )

      // Generate Entries
      const entries = aggs.map((day: any) => {
        const importPayments = Number(day.import_payments) || 0
        const customsCost = Number(day.customs_cost) || 0
        const totalPayables = Number(day.total_payables) || 0
        const totalReceivables = Number(day.total_receivables) || 0

        const flow =
          totalReceivables - totalPayables - importPayments - customsCost
        return {
          date: day.day,
          opening_balance: 0,
          total_receivables: totalReceivables,
          total_payables: totalPayables,
          daily_balance: flow,
          accumulated_balance: 0,
          import_payments: importPayments,
          customs_cost: customsCost,
          other_expenses: 0,
          is_projected: new Date(day.day) > today,
        }
      })

      // Running Balance Calculation
      let running = currentTotalBalance
      const todayStr = today.toISOString().split('T')[0]
      const todayIdx = entries.findIndex((e: any) => e.date === todayStr)

      // Forward from today
      if (todayIdx >= 0) {
        running = currentTotalBalance
        for (let i = todayIdx; i < entries.length; i++) {
          entries[i].opening_balance = running
          entries[i].accumulated_balance = running + entries[i].daily_balance
          running = entries[i].accumulated_balance
        }

        // Backward (Reverse engineering history)
        running = currentTotalBalance
        for (let i = todayIdx - 1; i >= 0; i--) {
          entries[i].accumulated_balance = running
          entries[i].opening_balance = running - entries[i].daily_balance
          running = entries[i].opening_balance
        }
      } else {
        // If today is not in range, just run forward from assumed start
        for (let i = 0; i < entries.length; i++) {
          entries[i].opening_balance = running
          entries[i].accumulated_balance = running + entries[i].daily_balance
          running = entries[i].accumulated_balance
        }
      }

      setCashFlowEntries(entries)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [user, selectedCompanyId, timeframe])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Actions
  const addBank = async (b: Bank) => {
    if (user) return salvarBankManual(b, user.id)
  }
  const updateBank = async (b: Bank) => {
    if (user) await salvarBankManual(b, user.id)
    fetchData()
  }
  const deleteBank = async (id: string) => {
    await supabase.from('banks').delete().eq('id', id)
    fetchData()
  }

  const addPayable = async (t: Transaction) => {
    if (!user) return
    await salvarPayableManual(t, user.id)
    fetchData()
  }

  const updatePayable = async (t: Transaction) => {
    if (!user) return
    await salvarPayableManual(t, user.id)
    fetchData()
  }

  const deletePayable = async (id: string) => {
    await deletePayableTransaction(id)
    fetchData()
  }

  return (
    <CashFlowContext.Provider
      value={{
        companies,
        selectedCompanyId,
        setSelectedCompanyId,
        bankBalances,
        banks,
        cashFlowEntries,
        kpis,
        receivables,
        payables,
        accountPayables,
        adjustments,
        importHistory,
        addBank,
        updateBank,
        deleteBank,
        addPayable,
        updatePayable,
        deletePayable,
        recalculateCashFlow: fetchData,
        loading,
        timeframe,
        setTimeframe,
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
