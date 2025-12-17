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
  FinancialAdjustment,
} from '@/lib/types'
import { generateCashFlowData } from '@/lib/mock-data'
import { isSameDay, parseISO } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  salvarReceivableManual,
  salvarPayableManual,
  importarReceivables,
  importarPayables,
} from '@/services/financial'

interface CashFlowContextType {
  companies: Company[]
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string | null) => void

  receivables: Receivable[]
  payables: Transaction[]
  bankBalances: BankBalance[]
  adjustments: FinancialAdjustment[]
  cashFlowEntries: CashFlowEntry[]
  banks: Bank[]

  importHistory: ImportHistoryEntry[]

  addReceivable: (receivable: Receivable) => Promise<void>
  updateReceivable: (receivable: Receivable) => Promise<void>
  deleteReceivable: (id: string) => Promise<void>

  addPayable: (payable: Transaction) => Promise<void>
  updatePayable: (payable: Transaction) => Promise<void>
  deletePayable: (id: string) => Promise<void>

  updateBankBalances: (balances: BankBalance[]) => void
  resetBalanceHistory: () => void

  addBank: (bank: Bank) => Promise<{ error?: any }>
  updateBank: (bank: Bank) => Promise<void>
  deleteBank: (id: string) => void

  addAdjustment: (adjustment: FinancialAdjustment) => Promise<void>

  importData: (
    type: 'receivable' | 'payable',
    data: any[],
    filename?: string,
  ) => Promise<{ success: boolean; message: string }>
  clearImportHistory: () => void
  recalculateCashFlow: () => void
  loading: boolean
}

const CashFlowContext = createContext<CashFlowContextType | undefined>(
  undefined,
)

const STORAGE_KEYS = {
  SELECTED_COMPANY: 'hospcash_selectedCompany',
}

export const CashFlowProvider = ({ children }: { children: ReactNode }) => {
  const { allowedCompanyIds, userProfile, user, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)

  // --- State ---
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    () => {
      return localStorage.getItem(STORAGE_KEYS.SELECTED_COMPANY) || null
    },
  )

  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [payables, setPayables] = useState<Transaction[]>([])
  const [bankBalances, setBankBalances] = useState<BankBalance[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [adjustments, setAdjustments] = useState<FinancialAdjustment[]>([])
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([])
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([])

  // --- Fetch Data ---
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch Companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
      if (companiesData) setCompanies(companiesData)

      // Fetch Receivables
      const { data: receivablesData } = await supabase
        .from('receivables')
        .select('*')
      if (receivablesData) setReceivables(receivablesData as any)

      // Fetch Payables (Transactions)
      const { data: payablesData } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'payable')
      if (payablesData) setPayables(payablesData as any)

      // Fetch Banks
      const { data: banksData } = await supabase.from('banks').select('*')
      if (banksData) setBanks(banksData as any)

      // Fetch Bank Balances
      const { data: balancesData } = await supabase
        .from('bank_balances')
        .select('*')
      if (balancesData) setBankBalances(balancesData as any)

      // Fetch Adjustments
      const { data: adjustmentsData } = await supabase
        .from('financial_adjustments')
        .select('*')
      if (adjustmentsData) setAdjustments(adjustmentsData as any)

      // Fetch Import Logs (Recent)
      if (user) {
        const { data: logsData } = await supabase
          .from('import_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (logsData) {
          setImportHistory(
            logsData.map((log) => ({
              id: log.id,
              date: log.created_at,
              filename: log.filename,
              type: 'receivable', // Default fallback
              status: log.status === 'success' ? 'success' : 'error',
              records_count: log.total_records,
              user_name: userProfile?.name || 'Usuário',
              success_count: log.success_count,
              error_count: log.error_count,
              error_details: log.error_details,
            })),
          )
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  // Filter companies based on user access
  const visibleCompanies =
    userProfile?.profile === 'Administrator'
      ? companies
      : companies.filter((c) => allowedCompanyIds.includes(c.id))

  // Validate selected company
  useEffect(() => {
    if (
      selectedCompanyId &&
      userProfile?.profile !== 'Administrator' &&
      !allowedCompanyIds.includes(selectedCompanyId)
    ) {
      setSelectedCompanyId(null)
    }
  }, [selectedCompanyId, allowedCompanyIds, userProfile])

  useEffect(() => {
    if (selectedCompanyId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_COMPANY, selectedCompanyId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_COMPANY)
    }
  }, [selectedCompanyId])

  // --- Derived State (Filtering by Company) ---
  const filterByCompany = (item: { company_id?: string | null }) => {
    if (selectedCompanyId) return item.company_id === selectedCompanyId
    if (userProfile?.profile === 'Administrator') return true
    return item.company_id ? allowedCompanyIds.includes(item.company_id) : false
  }

  const filteredReceivables = receivables.filter(filterByCompany)
  const filteredPayables = payables.filter(filterByCompany)
  const filteredBankBalances = bankBalances.filter(filterByCompany)
  const filteredBanks = banks.filter(filterByCompany)
  const filteredAdjustments = adjustments.filter(filterByCompany)

  // --- Recalculation ---
  useEffect(() => {
    performRecalculation()
  }, [
    receivables,
    payables,
    bankBalances,
    adjustments,
    selectedCompanyId,
    companies,
  ])

  const performRecalculation = () => {
    const baseEntries = generateCashFlowData(90)

    const sortedEntries = [...baseEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    let currentAccumulated = 0

    const newEntries = sortedEntries.map((entry, index) => {
      const entryDate = parseISO(entry.date)

      const dayReceivables = filteredReceivables
        .filter(
          (r) =>
            isSameDay(parseISO(r.due_date), entryDate) &&
            r.title_status === 'Aberto',
        )
        .reduce(
          (sum, r) => sum + (r.updated_value || r.principal_value || 0),
          0,
        )

      const dayPayables = filteredPayables
        .filter(
          (p) =>
            isSameDay(parseISO(p.due_date), entryDate) &&
            p.status !== 'paid' &&
            p.status !== 'cancelled',
        )
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      const dayAdjustments = filteredAdjustments.filter((a) =>
        isSameDay(parseISO(a.date), entryDate),
      )
      const adjustmentsCredit = dayAdjustments
        .filter((a) => a.type === 'credit' && a.status === 'approved')
        .reduce((sum, a) => sum + a.amount, 0)

      const adjustmentsDebit = dayAdjustments
        .filter((a) => a.type === 'debit' && a.status === 'approved')
        .reduce((sum, a) => sum + a.amount, 0)

      const dayBalances = filteredBankBalances.filter((b) =>
        isSameDay(parseISO(b.date), entryDate),
      )

      const manualBalanceSum = dayBalances.reduce(
        (sum, b) => sum + b.balance,
        0,
      )
      const hasManualBalance = dayBalances.length > 0

      let openingBalance = 0
      if (index === 0) {
        openingBalance = hasManualBalance
          ? manualBalanceSum
          : entry.opening_balance
      } else {
        openingBalance = currentAccumulated
      }

      const dailyBalance =
        dayReceivables -
        dayPayables -
        entry.imports -
        entry.other_expenses +
        adjustments_credit -
        adjustments_debit

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
        adjustments_credit: adjustmentsCredit,
        adjustments_debit: adjustmentsDebit,
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
  const addReceivable = async (receivable: Receivable) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      await salvarReceivableManual(receivable, user.id)
      toast.success('Recebível adicionado com sucesso!')
      await fetchData() // Reload data
    } catch (error: any) {
      toast.error('Erro ao adicionar recebível: ' + error.message)
      console.error(error)
    }
  }

  const updateReceivable = async (receivable: Receivable) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      await salvarReceivableManual(receivable, user.id)
      toast.success('Recebível atualizado com sucesso!')
      await fetchData()
    } catch (error: any) {
      toast.error('Erro ao atualizar recebível: ' + error.message)
    }
  }

  const deleteReceivable = async (id: string) => {
    const { error } = await supabase.from('receivables').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir recebível')
      return
    }
    setReceivables((prev) => prev.filter((r) => r.id !== id))
  }

  const addPayable = async (payable: Transaction) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      await salvarPayableManual(payable, user.id)
      toast.success('Conta a pagar adicionada com sucesso!')
      await fetchData()
    } catch (error: any) {
      toast.error('Erro ao adicionar conta: ' + error.message)
    }
  }

  const updatePayable = async (payable: Transaction) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      await salvarPayableManual(payable, user.id)
      toast.success('Conta atualizada com sucesso!')
      await fetchData()
    } catch (error: any) {
      toast.error('Erro ao atualizar conta: ' + error.message)
    }
  }

  const deletePayable = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir conta')
      return
    }
    setPayables((prev) => prev.filter((p) => p.id !== id))
  }

  const updateBankBalances = async (newBalances: BankBalance[]) => {
    const { error } = await supabase.from('bank_balances').upsert(newBalances)
    if (error) {
      toast.error('Erro ao salvar saldos: ' + error.message)
      return
    }
    const { data } = await supabase.from('bank_balances').select('*')
    if (data) setBankBalances(data as any)
  }

  const resetBalanceHistory = async () => {
    if (selectedCompanyId) {
      await supabase
        .from('bank_balances')
        .delete()
        .eq('company_id', selectedCompanyId)
    } else {
      if (userProfile?.profile === 'Administrator') {
        await supabase.from('bank_balances').delete().neq('id', '0')
      }
    }
    const { data } = await supabase.from('bank_balances').select('*')
    if (data) setBankBalances(data as any)
  }

  const addBank = async (bank: Bank) => {
    const { id, ...data } = bank
    const { data: newBank, error } = await supabase
      .from('banks')
      .insert([{ ...data, company_id: bank.company_id || selectedCompanyId }])
      .select()
      .single()

    if (error) {
      return { error }
    }

    setBanks((prev) => [...prev, newBank as any])
    return { error: null }
  }

  const updateBank = async (updated: Bank) => {
    const { error } = await supabase
      .from('banks')
      .update(updated)
      .eq('id', updated.id)
    if (error) return
    setBanks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }

  const deleteBank = async (id: string) => {
    const { error } = await supabase
      .from('banks')
      .update({ active: false })
      .eq('id', id)
    if (error) return
    setBanks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: false } : b)),
    )
  }

  const addAdjustment = async (adjustment: FinancialAdjustment) => {
    const { id, ...data } = adjustment
    const { data: newAdj, error } = await supabase
      .from('financial_adjustments')
      .insert([
        {
          ...data,
          company_id: adjustment.company_id || selectedCompanyId,
          user_id: user?.id,
        },
      ])
      .select()
      .single()

    if (error) {
      toast.error('Erro ao adicionar ajuste: ' + error.message)
      console.error(error)
      return
    }

    setAdjustments((prev) => [newAdj as any, ...prev])
    toast.success('Ajuste registrado com sucesso!')
  }

  const importData = async (
    type: 'receivable' | 'payable',
    data: any[],
    filename: string = 'import.csv',
  ) => {
    setLoading(true)
    let successCount = 0
    let errorCount = 0
    let importResults: any = { success: false, errors: [], total: 0 }

    try {
      if (!user) throw new Error('Usuário não autenticado.')

      if (type === 'receivable') {
        importResults = await importarReceivables(data, user.id)
      } else if (type === 'payable') {
        importResults = await importarPayables(data, user.id)
      }

      successCount = importResults.success
      errorCount = importResults.errors.length

      // Log import
      if (user) {
        await supabase.from('import_logs').insert({
          user_id: user.id,
          filename: filename,
          status: errorCount === 0 && successCount > 0 ? 'success' : 'failure',
          total_records: data.length,
          success_count: successCount,
          error_count: errorCount,
          error_details:
            importResults.errors.length > 0 ? importResults.errors : null,
        })
      }

      // If any success, refresh data
      if (successCount > 0) {
        await refreshProfile()
        await fetchData()
      }

      if (errorCount > 0) {
        const errorMsg = importResults.errors.slice(0, 3).join('; ')
        return {
          success: false,
          message: `Importação com erros (${errorCount} falhas). ${errorMsg}`,
        }
      }

      if (importResults.message) {
        return {
          success: false,
          message: importResults.message,
        }
      }

      return {
        success: true,
        message: `Importação de ${successCount} registros realizada com sucesso!`,
      }
    } catch (error: any) {
      console.error('Import error:', error)
      if (user) {
        await supabase.from('import_logs').insert({
          user_id: user.id,
          filename: filename,
          status: 'failure',
          total_records: data.length,
          success_count: successCount,
          error_count: data.length,
          error_details: [{ error: `Critical: ${error.message}` }],
        })
      }

      return {
        success: false,
        message: `Falha crítica: ${error.message}`,
      }
    } finally {
      setLoading(false)
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
        companies: visibleCompanies,
        selectedCompanyId,
        setSelectedCompanyId,
        receivables: filteredReceivables,
        payables: filteredPayables,
        bankBalances: filteredBankBalances,
        adjustments: filteredAdjustments,
        cashFlowEntries,
        banks: filteredBanks,
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
        addAdjustment,
        importData,
        clearImportHistory,
        recalculateCashFlow,
        loading,
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
