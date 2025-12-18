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
  Payable,
} from '@/lib/types'
import {
  isSameDay,
  parseISO,
  startOfDay,
  subDays,
  addDays,
  isAfter,
  isBefore,
} from 'date-fns'
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
  fetchAllRecords,
} from '@/services/financial'
import { normalizeCompanyId } from '@/lib/utils'

interface CashFlowContextType {
  companies: Company[]
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string | null) => void

  receivables: Receivable[]
  payables: Transaction[]
  accountPayables: Payable[]
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

  addBank: (bank: Bank) => Promise<{ data?: Bank; error?: any }>
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
  ) => Promise<{
    success: boolean
    message: string
    stats?: {
      fileTotal: number
      importedTotal: number
      records: number
    }
    failures?: {
      document: string
      value: number
      reason: string
      line: number
    }[]
  }>
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
  const [accountPayables, setAccountPayables] = useState<Payable[]>([])
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
    // Clear data only if changing scope significantly to avoid flash
    // But for safety let's clear to avoid mixing data
    if (!selectedCompanyId) {
      // Logic could be refined to not clear if just refreshing
    }

    try {
      const visibleIds = await getVisibleCompanyIds(
        supabase,
        user.id,
        selectedCompanyId,
      )

      // Fetch Companies List
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

      // 2. Fetch ALL Receivables
      const allReceivables = await fetchAllRecords(
        supabase,
        'receivables',
        visibleIds,
      )
      setReceivables(allReceivables as any)

      // 3. Fetch ALL Payables (Transactions)
      const allPayables = await fetchAllRecords(
        supabase,
        'transactions',
        visibleIds,
        (q) => q.eq('type', 'payable'),
      )
      setPayables(allPayables as any)

      // 3b. Fetch Account Payables (Payables Table)
      const allAccountPayables = await fetchAllRecords(
        supabase,
        'payables',
        visibleIds,
      )
      setAccountPayables(allAccountPayables as any)

      // 4. Fetch Banks (Active Only)
      let banksQuery = supabase
        .from('banks')
        .select(
          'id, name, code, type, institution, agency, account_number, account_digit, company_id, active, created_at',
        )
        // We fetch inactive too to calculate history if needed, but for "Active Balance" user story says "active: true".
        // Let's fetch all and filter in memory.
        .order('created_at', { ascending: false })

      if (visibleIds.length > 0) {
        banksQuery = banksQuery.in('company_id', visibleIds)
      }
      const { data: banksData } = await banksQuery

      if (banksData) setBanks(banksData as any)

      // 5. Fetch Bank Balances (USING v2)
      let balancesQuery = supabase
        .from('bank_balances_v2')
        .select('*, banks(name, account_number)')
        .order('reference_date', { ascending: false })

      if (visibleIds.length > 0) {
        balancesQuery = balancesQuery.in('company_id', visibleIds)
      }
      const { data: balancesData } = await balancesQuery

      if (balancesData) {
        const mappedBalances: BankBalance[] = balancesData.map((b: any) => ({
          id: b.id,
          company_id: b.company_id,
          date: b.reference_date,
          bank_name: b.banks?.name || 'Unknown',
          bank_id: b.bank_id,
          account_number: b.banks?.account_number || '',
          balance: b.amount,
          status: 'saved',
        }))
        setBankBalances(mappedBalances)
      }

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
        .limit(100)

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
            type: 'receivable',
            status: log.status === 'success' ? 'success' : 'error',
            records_count: log.total_records || 0,
            user_name: userProfile?.name || 'Usuário',
            company_id: log.company_id,
            success_count: log.success_count || 0,
            error_count: log.error_count || 0,
            deleted_count: log.deleted_count || 0,
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

  const visibleCompanies =
    userProfile?.profile === 'Administrator'
      ? companies
      : companies.filter((c) => allowedCompanyIds.includes(c.id))

  useEffect(() => {
    performRecalculation()
  }, [
    receivables,
    payables,
    accountPayables,
    bankBalances,
    adjustments,
    selectedCompanyId,
    banks, // Added dependency
  ])

  const performRecalculation = () => {
    // Determine Scope
    const today = startOfDay(new Date())
    const startGenDate = subDays(today, 60) // 2 months back for history
    const endGenDate = addDays(today, 180) // 6 months forward for projection

    // 1. Identify active banks for current scope
    const activeBanks = banks.filter((b) => b.active)
    const scopeBanks =
      selectedCompanyId && selectedCompanyId !== 'all'
        ? activeBanks.filter((b) => b.company_id === selectedCompanyId)
        : activeBanks

    // 2. Calculate Anchor Balance (Latest balance <= Today)
    let anchorBalance = 0
    scopeBanks.forEach((bank) => {
      const bankBals = bankBalances.filter((b) => b.bank_id === bank.id)

      // Find latest balance strictly before or on today
      const sorted = bankBals
        .filter((b) => !isAfter(parseISO(b.date), today))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      if (sorted.length > 0) {
        anchorBalance += sorted[0].balance
      }
    })

    // 3. Generate Daily Flows
    const dates: Date[] = []
    let curr = startGenDate
    while (curr <= endGenDate) {
      dates.push(curr)
      curr = addDays(curr, 1)
    }

    const flowData = dates.map((date) => {
      // Filter Receivables
      const dayReceivables = receivables
        .filter(
          (r) =>
            isSameDay(parseISO(r.due_date), date) &&
            r.title_status !== 'Cancelado' &&
            // Exclude paid items in future (unlikely but safe)
            (isBefore(date, today) ? true : r.title_status === 'Aberto'),
        )
        .reduce(
          (sum, r) => sum + (r.updated_value || r.principal_value || 0),
          0,
        )

      // Filter Payables (Transactions)
      const dayPayablesTransactions = payables
        .filter(
          (p) =>
            isSameDay(parseISO(p.due_date), date) &&
            p.status !== 'cancelled' &&
            (isBefore(date, today) ? true : p.status !== 'paid'),
        )
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      // Filter Payables (Table)
      const dayAccountPayables = accountPayables
        .filter((p) => p.due_date && isSameDay(parseISO(p.due_date), date))
        .reduce((sum, p) => sum + (p.principal_value || 0), 0)

      const totalDayPayables = dayPayablesTransactions + dayAccountPayables

      // Filter Adjustments
      const dayAdjustments = adjustments.filter(
        (a) => isSameDay(parseISO(a.date), date) && a.status === 'approved',
      )
      const adjustmentsCredit = dayAdjustments
        .filter((a) => a.type === 'credit')
        .reduce((sum, a) => sum + a.amount, 0)
      const adjustmentsDebit = dayAdjustments
        .filter((a) => a.type === 'debit')
        .reduce((sum, a) => sum + a.amount, 0)

      const dailyBalance =
        dayReceivables - totalDayPayables + adjustmentsCredit - adjustmentsDebit

      // Check imports/other (using 0 for now as they are not fully implemented in flow calculation yet)
      const imports = 0
      const other_expenses = 0

      return {
        date,
        dayReceivables,
        totalDayPayables,
        imports,
        other_expenses,
        adjustmentsCredit,
        adjustmentsDebit,
        dailyBalance,
      }
    })

    // 4. Calculate Accumulated Balances using Anchor
    const todayIndex = flowData.findIndex((f) => isSameDay(f.date, today))

    // Initialize map
    const entriesMap: Record<string, CashFlowEntry> = {}

    if (todayIndex !== -1) {
      // A. Forward from Today
      let currentAccumulated = anchorBalance
      for (let i = todayIndex; i < flowData.length; i++) {
        const flow = flowData[i]
        const opening = currentAccumulated
        const accumulated = opening + flow.dailyBalance

        entriesMap[flow.date.toISOString()] = {
          date: flow.date.toISOString(),
          opening_balance: opening,
          total_receivables: flow.dayReceivables,
          total_payables: flow.totalDayPayables,
          imports: flow.imports,
          other_expenses: flow.other_expenses,
          adjustments_credit: flow.adjustmentsCredit,
          adjustments_debit: flow.adjustmentsDebit,
          daily_balance: flow.dailyBalance,
          accumulated_balance: accumulated,
          has_alert: accumulated < 0,
          alert_message: accumulated < 0 ? 'Saldo negativo' : undefined,
          is_projected: true,
          is_weekend: flow.date.getDay() === 0 || flow.date.getDay() === 6,
        }

        currentAccumulated = accumulated
      }

      // B. Backward from Today (Reconstruction)
      // Open(Today) = Anchor.
      // Close(Yesterday) = Open(Today).
      // Open(Yesterday) = Close(Yesterday) - DailyFlow(Yesterday).
      let nextOpening = anchorBalance
      for (let i = todayIndex - 1; i >= 0; i--) {
        const flow = flowData[i]
        const accumulated = nextOpening // Yesterday's close is Today's open
        const opening = accumulated - flow.dailyBalance

        entriesMap[flow.date.toISOString()] = {
          date: flow.date.toISOString(),
          opening_balance: opening,
          total_receivables: flow.dayReceivables,
          total_payables: flow.totalDayPayables,
          imports: flow.imports,
          other_expenses: flow.other_expenses,
          adjustments_credit: flow.adjustmentsCredit,
          adjustments_debit: flow.adjustmentsDebit,
          daily_balance: flow.dailyBalance,
          accumulated_balance: accumulated,
          has_alert: accumulated < 0,
          alert_message:
            accumulated < 0 ? 'Saldo negativo histórico' : undefined,
          is_projected: false,
          is_weekend: flow.date.getDay() === 0 || flow.date.getDay() === 6,
        }

        nextOpening = opening
      }
    }

    // Convert map to sorted array
    const finalEntries = Object.values(entriesMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    setCashFlowEntries(finalEntries)
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

  const addReceivable = async (receivable: Receivable) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      const data = await salvarReceivableManual(receivable, user.id)
      await logAudit('Create', 'Receivables', data.id, {
        invoice: data.invoice_number,
      })
      toast.success('Recebível adicionado com sucesso!')
      await fetchData()
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
    await fetchData()
  }

  const resetBalanceHistory = async () => {
    const visibleIds = await getVisibleCompanyIds(
      supabase,
      user?.id || '',
      selectedCompanyId,
    )
    if (visibleIds.length > 0) {
      await supabase
        .from('bank_balances_v2')
        .delete()
        .in('company_id', visibleIds)
    }
    await fetchData()
  }

  const addBank = async (bank: Bank) => {
    try {
      if (!user) throw new Error('Usuário não autenticado')
      const data = await salvarBankManual(bank, user.id)
      await logAudit('Create', 'Banks', data.id, { name: data.name })
      await fetchData()
      return { data, error: null }
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
    let deletedCount = 0
    let fileTotal = 0
    let importedTotal = 0
    let importResults: any = {
      success: 0,
      errors: [],
      failures: [],
      deleted: 0,
      total: 0,
      lastCompanyId: '',
      fileTotal: 0,
      importedTotal: 0,
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
      deletedCount = importResults.deleted || 0
      fileTotal = importResults.fileTotal || 0
      importedTotal = importResults.importedTotal || 0

      // Integrity Check
      const integrityDiff = Math.abs(fileTotal - importedTotal)
      const isIntegrityError = integrityDiff > 0.1

      if (isIntegrityError) {
        importResults.errors.push(
          `Erro de Integridade: Valor total do arquivo (R$ ${fileTotal.toFixed(2)}) difere do valor importado (R$ ${importedTotal.toFixed(2)}).`,
        )
        // If no explicit failures caused this, maybe it's a batch issue or rounding.
        // But usually failures list will contain rows that caused missing data.
        errorCount++
      }

      const stats = {
        fileTotal,
        importedTotal,
        records: successCount,
      }

      if (user) {
        const logCompanyId =
          fallbackCompanyId || importResults.lastCompanyId || selectedCompanyId

        if (logCompanyId && logCompanyId !== 'all') {
          const errorDetails =
            importResults.errors.length > 0
              ? importResults.errors
              : isIntegrityError
                ? [
                    `Divergência de valores: File=${fileTotal}, DB=${importedTotal}`,
                  ]
                : null

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
              deleted_count: deletedCount,
              error_details: errorDetails,
              company_id: logCompanyId,
            })
            .select()
            .single()

          if (logData) {
            await logAudit('Import', 'DataImport', logData.id, {
              type,
              count: successCount,
              deleted: deletedCount,
              fileTotal,
              importedTotal,
            })
          }
        }
      }

      if (successCount > 0) {
        await refreshProfile()
        await fetchData()
      }

      // Return failures for UI display
      const failures = importResults.failures || []

      if (errorCount > 0) {
        const errorMsg = importResults.errors.slice(0, 3).join('; ')
        return {
          success: false,
          message: `Importação com erros (${errorCount} falhas). ${errorMsg}`,
          stats,
          failures,
        }
      }

      if (importResults.message) {
        return {
          success: false,
          message: importResults.message,
          stats,
          failures,
        }
      }

      return {
        success: true,
        message: `Importação de ${successCount} registros realizada com sucesso!`,
        stats,
        failures,
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
    performRecalculation()
  }

  return (
    <CashFlowContext.Provider
      value={{
        companies: visibleCompanies,
        selectedCompanyId,
        setSelectedCompanyId,
        receivables: receivables,
        payables: payables,
        accountPayables,
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
