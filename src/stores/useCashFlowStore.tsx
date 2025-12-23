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

  // Default to Next 30 Days view
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 30),
  })

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
      // Using 30 days as default context for general KPIs if not specified
      const kpiData = await getDashboardKPIs(activeId, 30)
      setKpis(kpiData as KPI)

      // 4. Calculate Cash Flow
      const today = startOfDay(new Date())

      // Determine fetch range.
      // We MUST fetch from Today (or start of dateRange if earlier) to calculate cumulative balance correctly.
      let fetchStart = subDays(today, 15) // Context history
      if (dateRange?.from && isBefore(dateRange.from, fetchStart)) {
        fetchStart = subDays(dateRange.from, 1)
      } else if (!dateRange?.from) {
        // Fallback
        fetchStart = subDays(today, 7)
      }

      let fetchEnd = addDays(today, 90) // Default projection
      if (dateRange?.to && isAfter(dateRange.to, fetchEnd)) {
        fetchEnd = dateRange.to
      }

      // Ensure we cover the gap between fetchStart and dateRange.to
      // Case: User selects "Next Month" (starts in 10 days). We need Today -> Next Month End to calculate opening.
      // So fetchStart is effectively Today (or a bit earlier for context).
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
      // Find index of Today to anchor the known balance
      const todayStr = today.toISOString().split('T')[0]
      // Use fuzzy match or find closest
      let todayIdx = entries.findIndex((e: any) => e.date === todayStr)

      // If today is not in results (maybe no transactions today), we sort entries by date first just in case
      entries.sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      )

      // Re-find today index after sort
      todayIdx = entries.findIndex((e: any) => e.date === todayStr)

      // If still not found, find the closest date after today or before today
      if (todayIdx === -1) {
        // This can happen if getCashFlowAggregates returns gaps (though it usually fills gaps if using generate_series in SQL, but let's be safe)
        // Assuming aggregates might have gaps, we should ideally fill them.
        // For now, let's assume continuous series or handle gaps in UI.
        // Let's find insertion point
        // Or simplistic approach: Just propagate balance
      }

      let running = currentTotalBalance

      // We need to propagate Forward from Today
      // And Backward from Today

      // If today exists in entries
      if (todayIdx !== -1) {
        // Set Today's Opening Balance
        // Actually currentTotalBalance is usually the *Closing* balance of Today if we just fetched from banks?
        // Or is it real-time? Let's assume it's the current state.
        // For projection, let's assume it's the starting point for *Future* moves.
        // So: Today Opening + Today Flow = Today Closing.
        // If "currentTotalBalance" is Live Balance, it includes processed transactions.
        // Let's treat currentTotalBalance as the "Anchor" for the balance curve at "Now".

        // Forward
        running = currentTotalBalance
        // For entries AFTER today
        for (let i = todayIdx + 1; i < entries.length; i++) {
          entries[i].opening_balance = running
          entries[i].accumulated_balance = running + entries[i].daily_balance
          running = entries[i].accumulated_balance
        }

        // Current Day Adjustment
        // If we consider currentTotalBalance as "Current State", then:
        // entry[today].accumulated_balance = currentTotalBalance + (remaining flow today?)
        // This is tricky. Let's simplify:
        // accumulated_balance for Today = currentTotalBalance + projected remaining flow.
        // But we don't know remaining vs executed flow in aggregates easily.
        // Simplification: entries[today].accumulated_balance = currentTotalBalance + entries[today].daily_balance (Assuming bank balance is Morning balance? No, usually Live).
        // If Live, then we shouldn't add Today's full projected flow again.
        // Let's assume currentTotalBalance is the "Base" for Tomorrow.
        // So Today's Accumulated = currentTotalBalance.
        entries[todayIdx].accumulated_balance = currentTotalBalance
        entries[todayIdx].opening_balance =
          currentTotalBalance - entries[todayIdx].daily_balance // derived

        // Backward
        running = entries[todayIdx].opening_balance
        for (let i = todayIdx - 1; i >= 0; i--) {
          entries[i].accumulated_balance = running
          entries[i].opening_balance = running - entries[i].daily_balance
          running = entries[i].opening_balance
        }

        // Re-run forward from Today+1 to rely on Today's Closing
        running = entries[todayIdx].accumulated_balance
        for (let i = todayIdx + 1; i < entries.length; i++) {
          entries[i].opening_balance = running
          entries[i].accumulated_balance = running + entries[i].daily_balance
          running = entries[i].accumulated_balance
        }
      } else {
        // If Today is missing (gaps), just run linearly from the first record assuming some start?
        // Or finding the closest date.
        // Let's just run from index 0 with currentTotalBalance as fallback if index 0 is close to today.
        // If index 0 is far in past, this is inaccurate.
        // Ideally we fetch a continuous series.
        // Let's assume we sort and just propagate.

        // Find closest date to today to anchor
        let closestDist = Infinity
        let anchorIdx = 0
        entries.forEach((e: any, idx: number) => {
          const d = Math.abs(new Date(e.date).getTime() - today.getTime())
          if (d < closestDist) {
            closestDist = d
            anchorIdx = idx
          }
        })

        // Anchor at closest
        entries[anchorIdx].accumulated_balance = currentTotalBalance

        // Propagate Back
        running =
          entries[anchorIdx].accumulated_balance -
          entries[anchorIdx].daily_balance // opening of anchor
        entries[anchorIdx].opening_balance = running

        for (let i = anchorIdx - 1; i >= 0; i--) {
          entries[i].accumulated_balance = running
          entries[i].opening_balance = running - entries[i].daily_balance
          running = entries[i].opening_balance
        }

        // Propagate Forward
        running = entries[anchorIdx].accumulated_balance
        for (let i = anchorIdx + 1; i < entries.length; i++) {
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
  }, [user, selectedCompanyId, dateRange]) // Re-fetch if range changes significantly? Or just depend on manual refresh?
  // Ideally we only refetch if dateRange extends beyond current loaded data.
  // For simplicity, refetch on dateRange change is safer.

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter entries based on selected dateRange
  const filteredEntries = cashFlowEntries.filter((e) => {
    if (!dateRange || !dateRange.from) return true
    const d = startOfDay(new Date(e.date))
    // We use startOfDay to ensure consistent comparison
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
