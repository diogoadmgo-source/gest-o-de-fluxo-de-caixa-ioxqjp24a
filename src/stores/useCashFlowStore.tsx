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
import { generateCashFlowData } from '@/lib/mock-data'
import { isSameDay, parseISO } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface CashFlowContextType {
  companies: Company[]
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string | null) => void

  receivables: Receivable[]
  payables: Transaction[]
  bankBalances: BankBalance[]
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

  addBank: (bank: Bank) => void
  updateBank: (bank: Bank) => void
  deleteBank: (id: string) => void

  importData: (
    type: 'receivable' | 'payable',
    data: any[],
    filename?: string,
  ) => Promise<void>
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
  const { allowedCompanyIds, userProfile } = useAuth()
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

  // --- Recalculation ---
  useEffect(() => {
    performRecalculation()
  }, [receivables, payables, bankBalances, selectedCompanyId])

  const performRecalculation = () => {
    // Generate base dates entries (mocking 90 days range for projection)
    // In a real app, this might come from a DB aggregation
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

      // Use bank balances if available for this day (manual override/snapshot)
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
        // Start with current available balance if today, otherwise previous accumulated
        openingBalance = hasManualBalance
          ? manualBalanceSum
          : entry.opening_balance // fallback
      } else {
        openingBalance = currentAccumulated
      }

      const dailyBalance =
        dayReceivables - dayPayables - entry.imports - entry.other_expenses

      let accumulatedBalance = openingBalance + dailyBalance

      if (hasManualBalance) {
        // If we have a concrete balance for this day, reset the accumulation to match reality
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
  const addReceivable = async (receivable: Receivable) => {
    const { id, ...data } = receivable // omit ID to let DB generate it or use it if provided
    const { data: newRec, error } = await supabase
      .from('receivables')
      .insert([
        {
          ...data,
          company_id: receivable.company_id || selectedCompanyId,
        },
      ])
      .select()
      .single()

    if (error) {
      toast.error('Erro ao adicionar recebível')
      console.error(error)
      return
    }

    setReceivables((prev) => [...prev, newRec as any])
    toast.success('Recebível adicionado')
  }

  const updateReceivable = async (updated: Receivable) => {
    const { error } = await supabase
      .from('receivables')
      .update(updated)
      .eq('id', updated.id)

    if (error) {
      toast.error('Erro ao atualizar recebível')
      return
    }
    setReceivables((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    )
  }

  const deleteReceivable = async (id: string) => {
    // Logical delete or actual delete? Let's do actual delete for now or status update
    // User story says "marcado como inativo" in one part, but usually delete.
    // Let's use status update to 'Cancelado' to be safe or delete.
    // Acceptance criteria doesn't specify delete behavior deeply.
    const { error } = await supabase.from('receivables').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir recebível')
      return
    }
    setReceivables((prev) => prev.filter((r) => r.id !== id))
  }

  const addPayable = async (payable: Transaction) => {
    const { id, ...data } = payable
    const { data: newPay, error } = await supabase
      .from('transactions')
      .insert([
        {
          ...data,
          type: 'payable',
          company_id: payable.company_id || selectedCompanyId,
        },
      ])
      .select()
      .single()

    if (error) {
      toast.error('Erro ao adicionar conta a pagar')
      return
    }
    setPayables((prev) => [...prev, newPay as any])
    toast.success('Conta a pagar adicionada')
  }

  const updatePayable = async (updated: Transaction) => {
    const { error } = await supabase
      .from('transactions')
      .update(updated)
      .eq('id', updated.id)

    if (error) {
      toast.error('Erro ao atualizar conta')
      return
    }
    setPayables((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
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
    // This usually involves upserting
    const { error } = await supabase.from('bank_balances').upsert(newBalances)
    if (error) {
      toast.error('Erro ao salvar saldos')
      return
    }
    // Refresh
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
      // Dangerous, maybe block or delete all
      // For safety, only if admin?
      // Just clear local state for now to not wipe everything if no company selected
      if (userProfile?.profile === 'Administrator') {
        await supabase.from('bank_balances').delete().neq('id', '0') // delete all
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
      toast.error('Erro ao adicionar banco')
      return
    }
    setBanks((prev) => [...prev, newBank as any])
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
    // Set active = false
    const { error } = await supabase
      .from('banks')
      .update({ active: false })
      .eq('id', id)
    if (error) return
    setBanks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: false } : b)),
    )
  }

  const importData = async (
    type: 'receivable' | 'payable',
    data: any[],
    filename: string = 'import.csv',
  ) => {
    setLoading(true)
    try {
      // Ensure companies exist
      const uniqueCompanies = new Set(
        data.map((d: any) => d.company || d.empresa).filter(Boolean),
      )

      // Simple check/create companies
      for (const compName of uniqueCompanies) {
        const exists = companies.find((c) => c.name === compName)
        if (!exists) {
          const { data: newComp } = await supabase
            .from('companies')
            .insert({ name: compName })
            .select()
            .single()
          if (newComp) setCompanies((prev) => [...prev, newComp])
        }
      }

      // Map data to DB structure
      const records = data.map((d: any) => {
        const companyName = d.company || d.empresa
        const companyId = companyName
          ? companies.find((c) => c.name === companyName)?.id ||
            selectedCompanyId
          : selectedCompanyId

        if (type === 'receivable') {
          return {
            company_id: companyId,
            customer: d.customer || d.cliente || 'Consumidor',
            invoice_number: d.invoice_number || d.nf || d.documento,
            issue_date: d.issue_date || d.emissao || new Date().toISOString(),
            due_date: d.due_date || d.vencimento || new Date().toISOString(),
            principal_value: parseFloat(d.principal_value || d.valor || 0),
            fine: parseFloat(d.fine || d.multa || 0),
            interest: parseFloat(d.interest || d.juros || 0),
            updated_value: parseFloat(d.updated_value || d.total || 0),
            title_status: d.title_status || 'Aberto',
            description: d.description || `Importado de ${filename}`,
          }
        } else {
          return {
            company_id: companyId,
            entity_name: d.entity_name || d.fornecedor,
            document_number: d.document_number || d.documento,
            issue_date: d.issue_date || d.emissao || new Date().toISOString(),
            due_date: d.due_date || d.vencimento || new Date().toISOString(),
            amount: parseFloat(d.amount || d.valor || 0),
            status: d.status || 'pending',
            type: 'payable',
            category: d.category || 'Geral',
            description: d.description || `Importado de ${filename}`,
          }
        }
      })

      const table = type === 'receivable' ? 'receivables' : 'transactions'
      const { error } = await supabase.from(table).insert(records)

      if (error) throw error

      // Refresh data
      await fetchData()

      setImportHistory((prev) => [
        {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          filename,
          type,
          status: 'success',
          records_count: records.length,
          user_name: userProfile?.name || 'Usuário',
        },
        ...prev,
      ])

      toast.success('Importação concluída com sucesso!')
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error('Erro na importação: ' + error.message)
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
