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
  salvarBankManual,
  salvarImportLogManual,
  importarReceivables,
  importarPayables,
  getVisibleCompanyIds,
} from '@/services/financial'
import { normalizeCompanyId } from '@/lib/utils'

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
  deleteBank: (id: string) => Promise<void>

  addAdjustment: (adjustment: FinancialAdjustment) => Promise<void>

  addImportLog: (log: ImportHistoryEntry) => Promise<void>
  updateImportLog: (log: ImportHistoryEntry) => Promise<void>
  deleteImportLog: (id: string) => Promise<void>

  importData: (
    type: 'receivable' | 'payable',
    data: any[],
    filename?: string,
    onProgress?: (percent: number) => void,
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
  const [selectedCompanyId, setInternalSelectedCompanyId] = useState<
    string | null
  >(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_COMPANY)
    return normalizeCompanyId(stored)
  })

  const setSelectedCompanyId = (id: string | null) => {
    const normalized = normalizeCompanyId(id)
    setInternalSelectedCompanyId(normalized)
    if (normalized) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_COMPANY, normalized)
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_COMPANY)
    }
  }

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
  }, [selectedCompanyId, user])

  const fetchData = async () => {
    if (!user) return

    setLoading(true)
    // Clear data to avoid ghosts
    setReceivables([])
    setPayables([])
    setBanks([])
    setBankBalances([])
    setAdjustments([])
    setCashFlowEntries([])
    setImportHistory([])

    try {
      // 1. Fetch Visible Companies (Single or All allowed)
      const visibleIds = await getVisibleCompanyIds(
        supabase,
        user.id,
        selectedCompanyId,
      )

      // Fetch Companies List for Dropdown
      const { data: userCompaniesData } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)

      const allUserCompanyIds =
        userCompaniesData?.map((uc) => uc.company_id) || []

      if (allUserCompanyIds.length > 0) {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('*')
          .in('id', allUserCompanyIds)
          .order('name')

        if (companiesData) setCompanies(companiesData)
      } else {
        setCompanies([])
      }

      // 2. Fetch Receivables with increased limit
      let receivablesQuery = supabase
        .from('receivables')
        .select('*')
        .range(0, 49999) // Fetch up to 50k rows to avoid default 1000 row limit

      if (visibleIds.length > 0) {
        receivablesQuery = receivablesQuery.in('company_id', visibleIds)
      }
      const { data: receivablesData, error: receivablesError } =
        await receivablesQuery

      if (receivablesError) {
        console.error('Error fetching receivables:', receivablesError)
        toast.error('Erro ao buscar recebíveis: ' + receivablesError.message)
      } else if (receivablesData) {
        setReceivables(receivablesData as any)
      }

      // 3. Fetch Payables with increased limit
      let payablesQuery = supabase
        .from('transactions')
        .select('*')
        .eq('type', 'payable')
        .range(0, 49999) // Fetch up to 50k rows

      if (visibleIds.length > 0) {
        payablesQuery = payablesQuery.in('company_id', visibleIds)
      }
      const { data: payablesData, error: payablesError } = await payablesQuery

      if (payablesError) {
        console.error('Error fetching payables:', payablesError)
      } else if (payablesData) {
        setPayables(payablesData as any)
      }

      // 4. Fetch Banks (Active Only, Ordered by created_at desc)
      let banksQuery = supabase
        .from('banks')
        .select(
          'id, name, code, type, institution, agency, account_number, account_digit, company_id, active, created_at',
        )
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (visibleIds.length > 0) {
        banksQuery = banksQuery.in('company_id', visibleIds)
      }
      const { data: banksData } = await banksQuery

      if (banksData) setBanks(banksData as any)

      // 5. Fetch Bank Balances
      let balancesQuery = supabase.from('bank_balances').select('*')
      if (visibleIds.length > 0) {
        balancesQuery = balancesQuery.in('company_id', visibleIds)
      }
      const { data: balancesData } = await balancesQuery

      if (balancesData) setBankBalances(balancesData as any)

      // 6. Fetch Adjustments
      let adjustmentsQuery = supabase.from('financial_adjustments').select('*')
      if (visibleIds.length > 0) {
        adjustmentsQuery = adjustmentsQuery.in('company_id', visibleIds)
      }
      const { data: adjustmentsData } = await adjustmentsQuery

      if (adjustmentsData) setAdjustments(adjustmentsData as any)

      // 7. Fetch Import Logs (Recent)
      let logsQuery = supabase
        .from('import_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100) // Keep logs limited to most recent

      if (visibleIds.length > 0) {
        logsQuery = logsQuery.in('company_id', visibleIds)
      }
      const { data: logsData } = await logsQuery

      if (logsData) {
        setImportHistory(
          logsData.map((log) => ({
            id: log.id,
            date: log.created_at,
            filename: log.filename,
            type: 'receivable', // Default fallback
            status: log.status === 'success' ? 'success' : 'error',
            records_count: log.total_records || 0,
            user_name: userProfile?.name || 'Usuário',
            company_id: log.company_id,
            success_count: log.success_count || 0,
            error_count: log.error_count || 0,
            error_details: log.error_details,
            created_at: log.created_at,
          })),
        )
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
      if (allowedCompanyIds.length > 0) {
        setSelectedCompanyId(null)
      }
    }
  }, [selectedCompanyId, allowedCompanyIds, userProfile])

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
    // If no data, empty state
    if (
      receivables.length === 0 &&
      payables.length === 0 &&
      bankBalances.length === 0 &&
      adjustments.length === 0
    ) {
      setCashFlowEntries([])
      return
    }

    const baseEntries = generateCashFlowData(90)

    const sortedEntries = [...baseEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    let currentAccumulated = 0

    const newEntries = sortedEntries.map((entry, index) => {
      const entryDate = parseISO(entry.date)

      const dayReceivables = receivables
        .filter(
          (r) =>
            isSameDay(parseISO(r.due_date), entryDate) &&
            r.title_status === 'Aberto',
        )
        .reduce(
          (sum, r) => sum + (r.updated_value || r.principal_value || 0),
          0,
        )

      const dayPayables = payables
        .filter(
          (p) =>
            isSameDay(parseISO(p.due_date), entryDate) &&
            p.status !== 'paid' &&
            p.status !== 'cancelled',
        )
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      const dayAdjustments = adjustments.filter((a) =>
        isSameDay(parseISO(a.date), entryDate),
      )
      const adjustmentsCredit = dayAdjustments
        .filter((a) => a.type === 'credit' && a.status === 'approved')
        .reduce((sum, a) => sum + a.amount, 0)

      const adjustmentsDebit = dayAdjustments
        .filter((a) => a.type === 'debit' && a.status === 'approved')
        .reduce((sum, a) => sum + a.amount, 0)

      const dayBalances = bankBalances.filter((b) =>
        isSameDay(parseISO(b.date), entryDate),
      )

      const manualBalanceSum = dayBalances.reduce(
        (sum, b) => sum + b.balance,
        0,
      )
      const hasManualBalance = dayBalances.length > 0

      let openingBalance = 0
      if (index === 0) {
        openingBalance = hasManualBalance ? manualBalanceSum : 0
      } else {
        openingBalance = currentAccumulated
      }

      const dailyBalance =
        dayReceivables - dayPayables + adjustmentsCredit - adjustmentsDebit

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
        imports: 0,
        other_expenses: 0,
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

  const logAudit = async (
    action: string,
    entity: string,
    entityId: string,
    details: any,
  ) => {
    if (!user) return
    await supabase.from('audit_logs').insert({
      action,
      entity,
      entity_id: entityId,
      user_id: user.id,
      details,
    })
  }

  // --- Actions ---
  const addReceivable = async (receivable: Receivable) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      const data = await salvarReceivableManual(receivable, user.id)
      await logAudit('Create', 'Receivables', data.id, {
        invoice: data.invoice_number,
      })
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
      const data = await salvarReceivableManual(receivable, user.id)
      await logAudit('Update', 'Receivables', data.id, {
        invoice: data.invoice_number,
      })
      toast.success('Recebível atualizado com sucesso!')
      await fetchData()
    } catch (error: any) {
      toast.error('Erro ao atualizar recebível: ' + error.message)
    }
  }

  const deleteReceivable = async (id: string) => {
    if (!user) return
    const { error } = await supabase.from('receivables').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir recebível')
      return
    }
    await logAudit('Delete', 'Receivables', id, {})
    setReceivables((prev) => prev.filter((r) => r.id !== id))
  }

  const addPayable = async (payable: Transaction) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      const data = await salvarPayableManual(payable, user.id)
      await logAudit('Create', 'Payables', data.id, {
        document: data.document_number,
      })
      toast.success('Conta a pagar adicionada com sucesso!')
      await fetchData()
    } catch (error: any) {
      toast.error('Erro ao adicionar conta: ' + error.message)
    }
  }

  const updatePayable = async (payable: Transaction) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      const data = await salvarPayableManual(payable, user.id)
      await logAudit('Update', 'Payables', data.id, {
        document: data.document_number,
      })
      toast.success('Conta atualizada com sucesso!')
      await fetchData()
    } catch (error: any) {
      toast.error('Erro ao atualizar conta: ' + error.message)
    }
  }

  const deletePayable = async (id: string) => {
    if (!user) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir conta')
      return
    }
    await logAudit('Delete', 'Payables', id, {})
    setPayables((prev) => prev.filter((p) => p.id !== id))
  }

  const updateBankBalances = async (newBalances: BankBalance[]) => {
    const { error } = await supabase.from('bank_balances').upsert(newBalances)
    if (error) {
      toast.error('Erro ao salvar saldos: ' + error.message)
      return
    }
    await fetchData()
  }

  const resetBalanceHistory = async () => {
    const visibleIds = await getVisibleCompanyIds(
      supabase,
      user?.id || '',
      selectedCompanyId,
    )
    if (visibleIds.length > 0) {
      await supabase.from('bank_balances').delete().in('company_id', visibleIds)
    }
    await fetchData()
  }

  const addBank = async (bank: Bank) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      const data = await salvarBankManual(bank, user.id)
      await logAudit('Create', 'Banks', data.id, { name: data.name })
      await fetchData()
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const updateBank = async (updated: Bank) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      const data = await salvarBankManual(updated, user.id)
      await logAudit('Update', 'Banks', data.id, { name: data.name })
      await fetchData()
    } catch (error: any) {
      toast.error('Erro ao atualizar banco: ' + error.message)
    }
  }

  const deleteBank = async (id: string) => {
    if (!user) return
    const { error } = await supabase
      .from('banks')
      .update({ active: false })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao inativar banco: ' + error.message)
      return
    }
    await logAudit('Delete', 'Banks', id, { status: 'inactive' })
    setBanks((prev) => prev.filter((b) => b.id !== id))
  }

  const addAdjustment = async (adjustment: FinancialAdjustment) => {
    const { id, ...data } = adjustment
    if (!data.company_id) {
      toast.error('Erro: Empresa obrigatória para ajuste.')
      return
    }
    const { data: newAdj, error } = await supabase
      .from('financial_adjustments')
      .insert([
        {
          ...data,
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
    await logAudit('Create', 'Adjustments', newAdj.id, {
      amount: newAdj.amount,
      type: newAdj.type,
    })

    setAdjustments((prev) => [newAdj as any, ...prev])
    toast.success('Ajuste registrado com sucesso!')
  }

  const addImportLog = async (log: ImportHistoryEntry) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      const data = await salvarImportLogManual(log, user.id)
      await logAudit('Create', 'ImportLogs', data.id, {
        filename: data.filename,
      })
      toast.success('Log de importação adicionado!')
      await fetchData()
    } catch (error: any) {
      toast.error('Erro ao adicionar log: ' + error.message)
    }
  }

  const updateImportLog = async (log: ImportHistoryEntry) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      const data = await salvarImportLogManual(log, user.id)
      await logAudit('Update', 'ImportLogs', data.id, {
        filename: data.filename,
      })
      toast.success('Log de importação atualizado!')
      await fetchData()
    } catch (error: any) {
      toast.error('Erro ao atualizar log: ' + error.message)
    }
  }

  const deleteImportLog = async (id: string) => {
    if (!user) return
    const { error } = await supabase.from('import_logs').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir log de importação')
      return
    }
    await logAudit('Delete', 'ImportLogs', id, {})
    setImportHistory((prev) => prev.filter((i) => i.id !== id))
  }

  const importData = async (
    type: 'receivable' | 'payable',
    data: any[],
    filename: string = 'import.csv',
    onProgress?: (percent: number) => void,
  ) => {
    setLoading(true)
    let successCount = 0
    let errorCount = 0
    let importResults: any = {
      success: 0,
      errors: [],
      total: 0,
      lastCompanyId: '',
    }

    try {
      if (!user) throw new Error('Usuário não autenticado.')

      const fallbackCompanyId = normalizeCompanyId(selectedCompanyId)

      if (type === 'receivable') {
        importResults = await importarReceivables(
          data,
          user.id,
          fallbackCompanyId,
          onProgress,
        )
      } else if (type === 'payable') {
        importResults = await importarPayables(
          data,
          user.id,
          fallbackCompanyId,
          onProgress,
        )
      }

      successCount = importResults.success
      errorCount = importResults.errors.length

      if (user) {
        const logCompanyId =
          fallbackCompanyId || importResults.lastCompanyId || selectedCompanyId

        if (logCompanyId && logCompanyId !== 'all') {
          const { data: logData } = await supabase
            .from('import_logs')
            .insert({
              user_id: user.id,
              filename: filename,
              status:
                errorCount === 0 && successCount > 0 ? 'success' : 'failure',
              total_records: data.length,
              success_count: successCount,
              error_count: errorCount,
              error_details:
                importResults.errors.length > 0 ? importResults.errors : null,
              company_id: logCompanyId,
            })
            .select()
            .single()

          if (logData) {
            await logAudit('Import', 'DataImport', logData.id, {
              type,
              count: successCount,
            })
          }
        }
      }

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
    fetchData()
  }

  return (
    <CashFlowContext.Provider
      value={{
        companies: visibleCompanies,
        selectedCompanyId,
        setSelectedCompanyId,
        receivables: receivables,
        payables: payables,
        bankBalances: bankBalances,
        adjustments: adjustments,
        cashFlowEntries,
        banks: banks,
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
        addImportLog,
        updateImportLog,
        deleteImportLog,
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
