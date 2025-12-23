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
  PayableStatsData,
} from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  getCashFlowAggregates,
  getDashboardKPIs,
  getLatestBankBalances,
  salvarBankManual,
  getPayableStats,
} from '@/services/financial'
import { normalizeCompanyId } from '@/lib/utils'
import {
  subDays,
  addDays,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  endOfDay,
} from 'date-fns'
import { queryClient } from '@/lib/query-client'
import { DateRange } from 'react-day-picker'

interface CashFlowContextType {
  companies: Company[]
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string | null) => void
  bankBalances: BankBalance[]
  banks: Bank[]
  cashFlowEntries: CashFlowEntry[] // Full computed range
  filteredEntries: CashFlowEntry[] // Entries within selected dateRange
  kpis: KPI | null
  receivables: Receivable[]
  payables: Transaction[]
  accountPayables: Payable[]
  adjustments: FinancialAdjustment[]
  importHistory: ImportHistoryEntry[]
  payableStats: PayableStatsData | null
  addBank: (bank: Bank) => Promise<any>
  updateBank: (bank: Bank) => Promise<void>
  deleteBank: (id: string) => Promise<void>
  addPayable: (transaction: Transaction) => Promise<void>
  updatePayable: (transaction: Transaction) => Promise<void>
  deletePayable: (id: string) => Promise<void>
  recalculateCashFlow: () => void
  fetchPayableStats: (filters: any) => Promise<void>
  loading: boolean
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
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

  // Default to Next 7 Days view
  const [timeframe, setTimeframeState] = useState<number>(7)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  })

  const setTimeframe = (days: number) => {
    setTimeframeState(days)
    setDateRange({
      from: new Date(),
      to: addDays(new Date(), days),
    })
  }

  const [companies, setCompanies] = useState<Company[]>([])
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([])
  const [bankBalances, setBankBalances] = useState<BankBalance[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [kpis, setKpis] = useState<KPI | null>(null)
  const [payableStats, setPayableStats] = useState<PayableStatsData | null>(
    null,
  )

  // Placeholders for legacy arrays
  const [receivables] = useState<Receivable[]>([])
  const [payables] = useState<Transaction[]>([])
  const [accountPayables] = useState<Payable[]>([])
  const [adjustments] = useState<FinancialAdjustment[]>([])
  const [importHistory] = useState<ImportHistoryEntry[]>([])

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

      // 1. Fetch Banks
      let banksQuery = supabase.from('banks').select('*').eq('active', true)
      if (activeId) {
        banksQuery = banksQuery.eq('company_id', activeId)
      } else if (ids.length > 0) {
        banksQuery = banksQuery.in('company_id', ids)
      } else {
        setBanks([])
        setBankBalances([])
        setCashFlowEntries([])
        setKpis(null)
        setLoading(false)
        return
      }

      const { data: banksData } = await banksQuery
      setBanks((banksData as Bank[]) || [])

      // 2. Fetch Latest Balances
      const latestBalances = await getLatestBankBalances(activeId)
      setBankBalances(latestBalances)

      // 3. Fetch KPI
      // Using timeframe for dynamic KPI calculation
      const kpiData = await getDashboardKPIs(activeId, timeframe)
      setKpis(kpiData as KPI)

      // 4. Calculate Cash Flow
      const today = startOfDay(new Date())

      // Determine fetch range.
      let fetchStart = subDays(today, 15) // Context history
      if (dateRange?.from && isBefore(dateRange.from, fetchStart)) {
        fetchStart = subDays(dateRange.from, 1)
      } else if (!dateRange?.from) {
        fetchStart = subDays(today, 7)
      }

      let fetchEnd = addDays(today, 90) // Default projection
      if (dateRange?.to && isAfter(dateRange.to, fetchEnd)) {
        fetchEnd = dateRange.to
      }

      if (isAfter(today, fetchStart)) {
        // fetchStart is already before today, good.
      } else {
        fetchStart = subDays(today, 1) // Ensure we have a baseline before today
      }

      const aggs = await getCashFlowAggregates(activeId, fetchStart, fetchEnd)

      // Initial Balance Sum (Today's known balance)
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
          date: day.day, // YYYY-MM-DD
          opening_balance: 0,
          total_receivables: totalReceivables,
          total_payables: totalPayables,
          daily_balance: flow,
          accumulated_balance: 0,
          import_payments: importPayments,
          customs_cost: customsCost,
          other_expenses: 0,
          is_projected: new Date(day.day) > today,
          is_weekend: [0, 6].includes(new Date(day.day).getDay()),
        }
      })

      // Running Balance Calculation
      const todayStr = today.toISOString().split('T')[0]
      let todayIdx = entries.findIndex((e: any) => e.date === todayStr)

      entries.sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      )

      todayIdx = entries.findIndex((e: any) => e.date === todayStr)

      let running = currentTotalBalance

      if (todayIdx !== -1) {
        entries[todayIdx].accumulated_balance = currentTotalBalance
        entries[todayIdx].opening_balance =
          currentTotalBalance - entries[todayIdx].daily_balance

        // Backward
        running = entries[todayIdx].opening_balance
        for (let i = todayIdx - 1; i >= 0; i--) {
          entries[i].accumulated_balance = running
          entries[i].opening_balance = running - entries[i].daily_balance
          running = entries[i].opening_balance
        }

        // Forward
        running = entries[todayIdx].accumulated_balance
        for (let i = todayIdx + 1; i < entries.length; i++) {
          entries[i].opening_balance = running
          entries[i].accumulated_balance = running + entries[i].daily_balance
          running = entries[i].accumulated_balance
        }
      } else {
        let closestDist = Infinity
        let anchorIdx = 0
        entries.forEach((e: any, idx: number) => {
          const d = Math.abs(new Date(e.date).getTime() - today.getTime())
          if (d < closestDist) {
            closestDist = d
            anchorIdx = idx
          }
        })

        if (entries.length > 0) {
          entries[anchorIdx].accumulated_balance = currentTotalBalance
          running =
            entries[anchorIdx].accumulated_balance -
            entries[anchorIdx].daily_balance
          entries[anchorIdx].opening_balance = running

          for (let i = anchorIdx - 1; i >= 0; i--) {
            entries[i].accumulated_balance = running
            entries[i].opening_balance = running - entries[i].daily_balance
            running = entries[i].opening_balance
          }

          running = entries[anchorIdx].accumulated_balance
          for (let i = anchorIdx + 1; i < entries.length; i++) {
            entries[i].opening_balance = running
            entries[i].accumulated_balance = running + entries[i].daily_balance
            running = entries[i].accumulated_balance
          }
        }
      }

      setCashFlowEntries(entries)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [user, selectedCompanyId, dateRange, timeframe])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredEntries = cashFlowEntries.filter((e) => {
    if (!dateRange || !dateRange.from) return true
    const d = startOfDay(new Date(e.date))
    const from = startOfDay(dateRange.from)
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from)
    return d >= from && d <= to
  })

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
    if (!selectedCompanyId || selectedCompanyId === 'all')
      throw new Error('Selecione uma empresa')
    const { error } = await supabase.from('transactions').insert({
      company_id: selectedCompanyId,
      type: 'payable',
      document_number: t.document_number,
      entity_name: t.entity_name,
      issue_date: t.issue_date,
      due_date: t.due_date,
      amount: t.amount,
      principal_value: t.principal_value,
      fine: t.fine,
      interest: t.interest,
      category: t.category,
      status: t.status,
      description: t.description,
    })
    if (error) throw error
    fetchData()
  }

  const updatePayable = async (t: Transaction) => {
    if (!user || !t.id) return
    const { error } = await supabase
      .from('transactions')
      .update({
        document_number: t.document_number,
        entity_name: t.entity_name,
        issue_date: t.issue_date,
        due_date: t.due_date,
        amount: t.amount,
        principal_value: t.principal_value,
        fine: t.fine,
        interest: t.interest,
        category: t.category,
        status: t.status,
        description: t.description,
      })
      .eq('id', t.id)
    if (error) throw error
    fetchData()
  }

  const deletePayable = async (id: string) => {
    if (!id) throw new Error('ID obrigatório')
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    fetchData()
  }

  const fetchPayableStats = async (filters: any) => {
    if (!selectedCompanyId || selectedCompanyId === 'all') {
      setPayableStats(null)
      return
    }
    try {
      const stats = await getPayableStats(selectedCompanyId, filters)
      setPayableStats(stats)
    } catch (err) {
      console.error('Failed to fetch payable stats', err)
      setPayableStats(null)
    }
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
        filteredEntries,
        kpis,
        receivables,
        payables,
        accountPayables,
        adjustments,
        importHistory,
        payableStats,
        addBank,
        updateBank,
        deleteBank,
        addPayable,
        updatePayable,
        deletePayable,
        recalculateCashFlow: fetchData,
        fetchPayableStats,
        loading,
        dateRange,
        setDateRange,
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
