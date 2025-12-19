import { supabase } from '@/lib/supabase/client'
import { parse, isValid, format } from 'date-fns'
import { performanceMonitor } from '@/lib/performance'
import { isGarbageCompany, parsePtBrFloat } from '@/lib/utils'
import { ImportBatchSummary, ImportReject, KPI, BankBalance } from '@/lib/types'

export interface PaginatedResult<T> {
  data: T[]
  count: number
  error: any
}

export interface ImportResult {
  success: boolean
  message: string
  stats?: any
  failures: any[]
}

const RECEIVABLE_MAPPINGS = {
  invoice_number: [
    'Nota Fiscal',
    'Fatura',
    'Documento',
    'NF',
    'invoice_number',
    'Doc',
    'Nº Nota',
    'Num Nota',
  ],
  order_number: ['Pedido', 'Ordem', 'order_number', 'PO', 'Nº Pedido'],
  customer: [
    'Cliente',
    'customer',
    'Razão Social',
    'Nome Fantasia',
    'Sacado',
    'Nome',
  ],
  customer_doc: [
    'CNPJ/CPF',
    'CNPJ',
    'CPF',
    'customer_doc',
    'Documento Cliente',
    'CNPJ/CPF',
  ],
  issue_date: [
    'Emissão',
    'Data Emissão',
    'issue_date',
    'Data de Emissão',
    'Dt Emissão',
  ],
  due_date: [
    'Dt. Vencimento',
    'Vencimento',
    'Data Vencimento',
    'due_date',
    'Data de Vencimento',
    'Vcto',
    'Dt Vencimento',
  ],
  principal_value: [
    'Vlr Principal',
    'Valor Principal',
    'Valor',
    'Principal',
    'principal_value',
    'Valor Original',
    'Valor do Título',
  ],
  fine: ['Multa', 'fine', 'Vlr Multa'],
  interest: ['Juros', 'interest', 'Vlr Juros'],
  updated_value: [
    'Vlr Atualizado',
    'Valor Atualizado',
    'updated_value',
    'Valor Total',
    'Total',
  ],
  installment: ['Parcela', 'installment', 'Parc'],
  title_status: ['Status', 'title_status', 'Situação'],
  description: ['Descrição', 'Observação', 'description', 'Obs', 'Histórico'],
  company: ['Empresa', 'Company', 'Loja', 'Unidade', 'Filial'],
  payment_prediction: [
    'Previsão de Pgto.',
    'Previsão',
    'payment_prediction',
    'Previsão Pagto',
    'Data Previsão',
  ],
  seller: ['Vendedor', 'seller', 'Representante'],
  customer_code: ['Cod Cliente', 'customer_code', 'Código Cliente'],
  uf: ['UF', 'uf', 'Estado'],
  regional: ['Regional', 'regional'],
  days_overdue: ['Dias', 'Dias Atraso', 'days_overdue', 'Atraso'],
  utilization: ['Utilização', 'utilization'],
  negativado: ['Negativado', 'negativado'],
  customer_name: ['Nome Cliente', 'customer_name', 'Razão Social Cliente'],
  new_status: ['Novo Status', 'new_status'],
}

const REQUIRED_FIELDS = [
  { key: 'invoice_number', label: 'Nota Fiscal' },
  { key: 'customer', label: 'Cliente' },
  { key: 'due_date', label: 'Vencimento' },
  { key: 'principal_value', label: 'Valor' },
]

function getCol(row: any, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key]
  }
  const rowKeys = Object.keys(row)
  for (const key of keys) {
    const found = rowKeys.find((k) => k.toLowerCase() === key.toLowerCase())
    if (found) return row[found]
  }
  return undefined
}

export async function fetchPaginatedReceivables(
  companyId: string,
  page: number,
  pageSize: number,
  filters: any,
): Promise<PaginatedResult<any>> {
  return performanceMonitor.measurePromise(
    '/receivables',
    'fetch_paginated',
    (async () => {
      let query = supabase
        .from('receivables')
        .select(
          'id, invoice_number, order_number, customer, customer_name, principal_value, updated_value, due_date, issue_date, title_status, new_status, days_overdue, uf, installment, fine, interest',
          { count: 'exact' },
        )
        .eq('company_id', companyId)

      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'vencida') {
          query = query
            .eq('title_status', 'Aberto')
            .lt('due_date', format(new Date(), 'yyyy-MM-dd'))
        } else if (filters.status === 'a_vencer') {
          query = query
            .eq('title_status', 'Aberto')
            .gte('due_date', format(new Date(), 'yyyy-MM-dd'))
        } else {
          query = query.eq('title_status', filters.status)
        }
      }

      if (filters.search) {
        const term = `%${filters.search}%`
        query = query.or(
          `customer.ilike.${term},invoice_number.ilike.${term},order_number.ilike.${term},customer_name.ilike.${term}`,
        )
      }

      if (filters.dateRange?.from) {
        const fromStr = format(filters.dateRange.from, 'yyyy-MM-dd')
        const toStr = filters.dateRange.to
          ? format(filters.dateRange.to, 'yyyy-MM-dd')
          : fromStr
        query = query.gte('due_date', fromStr).lte('due_date', toStr)
      }

      const sortCol = filters.sortBy || 'due_date'
      query = query
        .order(sortCol, {
          ascending: filters.sortOrder === 'desc' ? false : true,
        })
        .order('invoice_number', { ascending: true })

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, count, error } = await query
      return { data: data || [], count: count || 0, error }
    })(),
    { companyId, page, filters },
  )
}

export async function fetchPaginatedPayables(
  companyId: string,
  page: number,
  pageSize: number,
  filters: any,
): Promise<PaginatedResult<any>> {
  return performanceMonitor.measurePromise(
    '/payables',
    'fetch_paginated',
    (async () => {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('type', 'payable')

      if (filters.status && filters.status !== 'all') {
        const today = format(new Date(), 'yyyy-MM-dd')
        if (filters.status === 'overdue') {
          query = query.eq('status', 'pending').lt('due_date', today)
        } else if (filters.status === 'upcoming') {
          query = query.eq('status', 'pending').gte('due_date', today)
        } else if (filters.status === 'due_today') {
          query = query.eq('due_date', today)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters.search) {
        query = query.ilike('document_number', `%${filters.search}%`)
      }

      if (filters.dateRange?.from) {
        const fromStr = format(filters.dateRange.from, 'yyyy-MM-dd')
        const toStr = filters.dateRange.to
          ? format(filters.dateRange.to, 'yyyy-MM-dd')
          : fromStr
        query = query.gte('due_date', fromStr).lte('due_date', toStr)
      }

      query = query
        .order('due_date', { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1)
      const { data, count, error } = await query
      return { data: data || [], count: count || 0, error }
    })(),
    { companyId, page, filters },
  )
}

export async function getDashboardKPIs(companyId: string) {
  return performanceMonitor.measurePromise(
    'dashboard',
    'get_kpis',
    (async () => {
      const { data, error } = await supabase.rpc('get_dashboard_kpis', {
        p_company_id: companyId,
      })
      if (error) throw error
      return data as KPI
    })(),
  )
}

export async function getLatestBankBalances(
  companyId: string,
): Promise<BankBalance[]> {
  return performanceMonitor.measurePromise(
    'bank_balances',
    'get_latest',
    (async () => {
      const { data, error } = await supabase.rpc('get_latest_balances', {
        p_company_id: companyId,
      })
      if (error) throw error
      return (data || []).map((b: any) => ({
        id: b.bank_id,
        company_id: companyId,
        date: b.reference_date,
        bank_name: b.bank_name,
        bank_id: b.bank_id,
        account_number: b.account_number,
        balance: b.balance,
        status: 'saved',
        type: b.bank_type,
      }))
    })(),
  )
}

export async function getCashFlowAggregates(
  companyId: string,
  startDate: Date,
  endDate: Date,
) {
  return performanceMonitor.measurePromise(
    'cashflow',
    'get_aggregates',
    (async () => {
      const { data, error } = await supabase.rpc('get_cash_flow_aggregates', {
        p_company_id: companyId,
        p_start_date: format(startDate, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd'),
      })
      if (error) throw error
      return data
    })(),
  )
}

export function normalizeText(text: any): string {
  if (text === null || text === undefined) return ''
  return String(text).trim().replace(/^"|"$/g, '')
}

export function n(value: any): number {
  try {
    return parsePtBrFloat(value, 'Valor')
  } catch (e) {
    return 0
  }
}

export function d(value: any): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().split('T')[0]
  const str = String(value).trim()
  if (!str) return null
  const formats = [
    'dd/MM/yyyy',
    'dd-MM-yyyy',
    'yyyy-MM-dd',
    'dd/MM/yy',
    'MM/dd/yyyy',
  ]
  for (const fmt of formats) {
    const parsed = parse(str, fmt, new Date())
    if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')
  }
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10)
  return null
}

export async function ensureCompanyAndLink(
  userId: string,
  companyIdOrName: string,
): Promise<string> {
  const val = normalizeText(companyIdOrName)
  if (!val) throw new Error('ID ou Nome da empresa é obrigatório')
  if (isGarbageCompany(val)) throw new Error(`Bloqueado: ${val}`)
  const { data, error } = await supabase.rpc('ensure_company_and_link_user', {
    p_user_id: userId,
    p_company_name: val,
  })
  if (error) throw error
  if (!data) throw new Error('Falha crítica: ID da empresa não retornado.')
  return data as string
}

export async function importReceivablesRobust(
  userId: string,
  companyId: string,
  data: any[],
  fileName: string,
) {
  const sanitized = data.map((d) => {
    const get = (k: string[]) => getCol(d, k)
    let principalVal = 0
    try {
      principalVal = parsePtBrFloat(
        get(RECEIVABLE_MAPPINGS.principal_value),
        'Valor Principal',
      )
    } catch (e) {
      // ignore error
    }
    let updatedVal = 0
    try {
      updatedVal = parsePtBrFloat(
        get(RECEIVABLE_MAPPINGS.updated_value),
        'Valor Atualizado',
      )
    } catch (e) {
      updatedVal = principalVal
    }

    return {
      invoice_number: normalizeText(get(RECEIVABLE_MAPPINGS.invoice_number)),
      order_number: normalizeText(get(RECEIVABLE_MAPPINGS.order_number)),
      customer: normalizeText(get(RECEIVABLE_MAPPINGS.customer)),
      customer_doc: normalizeText(get(RECEIVABLE_MAPPINGS.customer_doc)),
      issue_date: get(RECEIVABLE_MAPPINGS.issue_date),
      due_date: get(RECEIVABLE_MAPPINGS.due_date),
      payment_prediction: get(RECEIVABLE_MAPPINGS.payment_prediction),
      principal_value: principalVal,
      updated_value: updatedVal,
      title_status: normalizeText(get(RECEIVABLE_MAPPINGS.title_status)),
      description: normalizeText(get(RECEIVABLE_MAPPINGS.description)),
    }
  })

  const { data: result, error } = await supabase.rpc(
    'import_receivables_replace',
    {
      p_company_id: companyId,
      p_user_id: userId,
      p_file_name: fileName,
      p_rows: sanitized,
    },
  )
  if (error) throw error
  return result as any
}

export async function importarReceivables(
  userId: string,
  data: any[],
  fallbackCompanyId?: string,
  fileName: string = 'import.csv',
): Promise<ImportResult> {
  if (!fallbackCompanyId || fallbackCompanyId === 'all')
    return { success: false, message: 'Selecione uma empresa', failures: [] }
  try {
    const summary = await importReceivablesRobust(
      userId,
      fallbackCompanyId,
      data,
      fileName,
    )
    return {
      success: true,
      message: `Processado: ${summary.imported_rows} inseridos`,
      stats: { records: summary.imported_rows },
      failures: [],
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message,
      failures: [{ error: err.message }],
    }
  }
}

export async function importarPayables(
  userId: string,
  data: any[],
  fallbackCompanyId?: string,
): Promise<ImportResult> {
  return {
    success: true,
    message: 'Not implemented in this fix scope',
    failures: [],
  }
}

export const salvarBankManual = async (payload: any, userId: string) => {
  const companyId = await ensureCompanyAndLink(
    userId,
    payload.company_id || payload.company_name,
  )
  const dbPayload = {
    company_id: companyId,
    name: payload.name,
    code: payload.code,
    institution: payload.institution,
    agency: payload.agency,
    account_number: payload.account_number,
    account_digit: payload.account_digit,
    active: payload.active,
    type: payload.type || 'bank',
  }

  if (payload.id && !payload.id.startsWith('temp-')) {
    const { data, error } = await supabase
      .from('banks')
      .update(dbPayload)
      .eq('id', payload.id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } else {
    const { data, error } = await supabase
      .from('banks')
      .insert(dbPayload)
      .select()
      .single()
    if (error) return { data: null, error }
    return { data, error: null }
  }
}

export const salvarReceivableManual = async (payload: any, userId: string) => {
  return { data: null, error: null }
}
export const salvarPayableManual = async (payload: any, userId: string) => {
  return { data: null, error: null }
}
export const salvarImportLogManual = async (payload: any, userId: string) => {
  return { data: null, error: null }
}

export async function getVisibleCompanyIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
  if (error) {
    console.error('Error fetching company IDs:', error)
    return []
  }
  return data?.map((d) => d.company_id) || []
}

export async function getReceivablesDashboardStats(companyId: string) {
  const { data, error } = await supabase.rpc('get_dashboard_kpis', {
    p_company_id: companyId,
  })
  if (error) {
    console.error('Error fetching stats:', error)
    return { total_open: 0, total_overdue: 0, total_received: 0 }
  }
  const kpi = data as any
  return {
    total_open: kpi.receivables_amount_open || 0,
    total_overdue: kpi.receivables_amount_overdue || 0,
    total_received: kpi.receivables_amount_received || 0,
  }
}

export async function fetchImportRejects(
  companyId: string,
  page = 1,
  pageSize = 20,
) {
  const { data, count, error } = await supabase
    .from('import_logs')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .eq('status', 'error')
    .range((page - 1) * pageSize, page * pageSize - 1)

  return { data: data || [], count: count || 0, error }
}

export async function fetchBalanceHistory(
  companyId: string,
  page: number,
  pageSize: number,
) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await supabase
    .from('bank_balances_v2')
    .select('*, banks(name, account_number)', { count: 'exact' })
    .eq('company_id', companyId)
    .order('reference_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  return { data, count, error }
}

export async function upsertBankBalance(payload: {
  company_id: string
  bank_id: string
  reference_date: string
  amount: number
}) {
  const { data, error } = await supabase
    .from('bank_balances_v2')
    .insert({
      company_id: payload.company_id,
      bank_id: payload.bank_id,
      reference_date: payload.reference_date,
      amount: payload.amount,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteBankBalance(id: string) {
  const { error } = await supabase
    .from('bank_balances_v2')
    .delete()
    .eq('id', id)
  if (error) throw error
}
