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
  importReceivablesRobust,
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

      if (activeId) {
        // 1. Fetch Banks
        const { data: banksData } = await supabase
          .from('banks')
          .select('*')
          .eq('company_id', activeId)
          .eq('active', true)
        setBanks((banksData as Bank[]) || [])

        // 2. Fetch Latest Balances (Corrected per User Story)
        const latestBalances = await getLatestBankBalances(activeId)
        setBankBalances(latestBalances)

        // 3. Fetch KPI (Corrected RPC)
        const kpiData = await getDashboardKPIs(activeId)
        setKpis(kpiData as KPI)

        // 4. Calculate Cash Flow
        const today = new Date()
        const start = subDays(today, 30)
        const end = addDays(today, 90)

        const aggs = await getCashFlowAggregates(activeId, start, end)

        // Initial Balance Sum
        const currentTotalBalance = latestBalances.reduce(
          (acc, b) => acc + (b.balance || 0),
          0,
        )

        // Generate Entries
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

        // Running Balance Calculation
        let running = currentTotalBalance
        const todayStr = today.toISOString().split('T')[0]
        const todayIdx = entries.findIndex((e: any) => e.date === todayStr)

        // Forward from today
        if (todayIdx >= 0) {
          // Set today's opening to current balance (snapshot)
          // Actually, standard cash flow starts from current balance and projects forward
          // Backward is history.

          // Forward
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
          // If today is not in range (unlikely), just run forward
          for (let i = 0; i < entries.length; i++) {
            entries[i].opening_balance = running
            entries[i].accumulated_balance = running + entries[i].daily_balance
            running = entries[i].accumulated_balance
          }
        }

        setCashFlowEntries(entries)
      } else {
        setCashFlowEntries([])
        setBankBalances([])
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
    // Simple Polling or Subscription could be added here
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
