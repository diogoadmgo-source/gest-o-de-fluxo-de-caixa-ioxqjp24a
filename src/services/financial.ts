import { supabase } from '@/lib/supabase/client'
import { parse, isValid, format } from 'date-fns'
import { performanceMonitor } from '@/lib/performance'
import { isGarbageCompany, parsePtBrFloat, normalizeText } from '@/lib/utils'
import {
  ImportBatchSummary,
  ImportReject,
  KPI,
  BankBalance,
  Transaction,
  PayableStatsData,
  PayableChartData,
} from '@/lib/types'

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

const PAYABLE_MAPPINGS = {
  document_number: [
    'Documento',
    'NF',
    'Nota Fiscal',
    'Doc',
    'Fatura',
    'document_number',
    'Nr. Doc',
  ],
  entity_name: [
    'Fornecedor',
    'Nome',
    'Supplier',
    'entity_name',
    'Beneficiário',
    'Favorecido',
  ],
  due_date: [
    'Vencimento',
    'Data Vencimento',
    'Vcto',
    'due_date',
    'Dt. Vencimento',
  ],
  issue_date: ['Emissão', 'Data Emissão', 'issue_date', 'Dt. Emissão'],
  amount: [
    'Valor',
    'Total',
    'Valor Total',
    'amount',
    'Liquido',
    'Valor Líquido',
  ],
  principal_value: [
    'Principal',
    'Valor Principal',
    'principal_value',
    'Valor Bruto',
  ],
  fine: ['Multa', 'fine', 'Vlr Multa'],
  interest: ['Juros', 'interest', 'Vlr Juros'],
  description: ['Descrição', 'Histórico', 'description', 'Obs'],
  category: ['Categoria', 'category', 'Classificação', 'Plano de Contas'],
  status: ['Status', 'status', 'Situação'],
}

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

      if (filters.supplier) {
        query = query.ilike('entity_name', `%${filters.supplier}%`)
      }

      if (filters.search) {
        const term = `%${filters.search}%`
        query = query.or(
          `document_number.ilike.${term},entity_name.ilike.${term}`,
        )
      }

      if (filters.minValue) {
        query = query.gte('amount', filters.minValue)
      }

      if (filters.maxValue) {
        query = query.lte('amount', filters.maxValue)
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

export async function getPayableStats(
  companyId: string,
  filters: any,
): Promise<PayableStatsData> {
  return performanceMonitor.measurePromise(
    '/payables',
    'fetch_stats',
    (async () => {
      const { data, error } = await supabase.rpc('get_payable_stats', {
        p_company_id: companyId,
        p_search: filters.search || null,
        p_supplier: filters.supplier || null,
        p_status: filters.status || null,
        p_date_range_start: filters.dateRange?.from
          ? format(filters.dateRange.from, 'yyyy-MM-dd')
          : null,
        p_date_range_end: filters.dateRange?.to
          ? format(filters.dateRange.to, 'yyyy-MM-dd')
          : filters.dateRange?.from
            ? format(filters.dateRange.from, 'yyyy-MM-dd')
            : null,
        p_min_value: filters.minValue ? Number(filters.minValue) : null,
        p_max_value: filters.maxValue ? Number(filters.maxValue) : null,
      })

      if (error) throw error
      return data as PayableStatsData
    })(),
    { companyId, filters },
  )
}

export async function getPayableChartsData(
  companyId: string,
  filters: any,
): Promise<PayableChartData> {
  return performanceMonitor.measurePromise(
    '/payables',
    'fetch_charts',
    (async () => {
      const { data, error } = await supabase.rpc('get_payable_charts_data', {
        p_company_id: companyId,
        p_search: filters.search || null,
        p_supplier: filters.supplier || null,
        p_status: filters.status || null,
        p_date_range_start: filters.dateRange?.from
          ? format(filters.dateRange.from, 'yyyy-MM-dd')
          : null,
        p_date_range_end: filters.dateRange?.to
          ? format(filters.dateRange.to, 'yyyy-MM-dd')
          : filters.dateRange?.from
            ? format(filters.dateRange.from, 'yyyy-MM-dd')
            : null,
        p_min_value: filters.minValue ? Number(filters.minValue) : null,
        p_max_value: filters.maxValue ? Number(filters.maxValue) : null,
      })

      if (error) throw error
      return data as PayableChartData
    })(),
    { companyId, filters },
  )
}

export async function getDashboardKPIs(
  companyId: string | null,
  timeframe: number,
) {
  return performanceMonitor.measurePromise(
    'dashboard',
    'get_kpis',
    (async () => {
      const { data, error } = await supabase.rpc('get_dashboard_kpis', {
        p_company_id: companyId,
        p_days: timeframe,
      })
      if (error) throw error
      return data as KPI
    })(),
  )
}

export async function getLatestBankBalances(
  companyId: string | null,
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
        company_id: companyId || 'all',
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
  companyId: string | null,
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
  const sanitized = data
    .filter((d) => {
      const get = (k: string[]) => getCol(d, k)
      const invoiceNumber = normalizeText(
        get(RECEIVABLE_MAPPINGS.invoice_number),
      )
      const customer = normalizeText(get(RECEIVABLE_MAPPINGS.customer))

      // Check missing mandatory fields
      if (!invoiceNumber || !customer) return false

      // Check garbage keywords
      if (isGarbageCompany(invoiceNumber) || isGarbageCompany(customer))
        return false

      // Check specific keywords from requirements (case insensitive)
      const invStr = String(invoiceNumber).toLowerCase()
      const custStr = String(customer).toLowerCase()
      if (
        invStr.includes('filtros aplicados') ||
        custStr.includes('filtros aplicados')
      )
        return false

      return true
    })
    .map((d) => {
      const get = (k: string[]) => getCol(d, k)
      let principalVal = 0
      let errorPrincipal = null

      try {
        principalVal = parsePtBrFloat(
          get(RECEIVABLE_MAPPINGS.principal_value),
          'Valor Principal',
        )
      } catch (e: any) {
        principalVal = 0
        errorPrincipal = e.message || 'erro_parse_valor_principal'
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

      const installment = normalizeText(get(RECEIVABLE_MAPPINGS.installment))
      const status =
        normalizeText(get(RECEIVABLE_MAPPINGS.title_status)) || 'Aberto'

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
        title_status: status,
        description: normalizeText(get(RECEIVABLE_MAPPINGS.description)),
        installment: installment || null,
        customer_name: normalizeText(get(RECEIVABLE_MAPPINGS.customer_name)),
        days_overdue: get(RECEIVABLE_MAPPINGS.days_overdue),
        uf: normalizeText(get(RECEIVABLE_MAPPINGS.uf)),
        new_status: normalizeText(get(RECEIVABLE_MAPPINGS.new_status)),
        _error_principal: errorPrincipal,
      }
    })

  // Calculate totals for potential fallback usage
  const totalAmount = sanitized.reduce(
    (sum, item) => sum + (Number(item.principal_value) || 0),
    0,
  )

  // Attempt 1: import_receivables_replace (Primary)
  let { data: result, error } = await supabase.rpc(
    'import_receivables_replace',
    {
      p_company_id: companyId,
      p_user_id: userId,
      p_file_name: fileName,
      p_rows: sanitized,
    },
  )

  // Attempt 2: strict_replace_receivables (Fallback)
  if (error) {
    console.warn(
      'Primary import RPC failed, attempting fallback to strict_replace_receivables.',
      error,
    )

    const { data: fallbackResult, error: fallbackError } = await supabase.rpc(
      'strict_replace_receivables',
      {
        p_company_id: companyId,
        p_rows: sanitized,
      },
    )

    if (fallbackError) {
      console.error('Fallback import RPC failed.', fallbackError)
      throw fallbackError
    }

    // Map fallback result to expected format
    const stats = (fallbackResult as any)?.stats || {}
    const inserted = stats.inserted || 0
    const skipped = stats.skipped || 0

    result = {
      success: true,
      message: 'Importado via fallback',
      batch_id: '', // Fallback doesn't create a batch log usually
      total_rows: sanitized.length,
      imported_rows: inserted,
      rejected_rows: skipped,
      imported_amount: totalAmount, // Approximate based on sanitized input
      total_amount: totalAmount,
      rejected_amount: 0,
      total_value: totalAmount,
      rejected_value: 0,
    }
  }

  if (error && !result) throw error

  return result as any
}

export async function importPayablesRobust(
  userId: string,
  companyId: string,
  data: any[],
) {
  const sanitized = data
    .filter((d) => {
      const name = getCol(d, PAYABLE_MAPPINGS.entity_name)
      if (isGarbageCompany(name)) return false
      const doc = getCol(d, PAYABLE_MAPPINGS.document_number)
      if (doc && String(doc).toLowerCase() === 'total') return false
      return true
    })
    .map((d) => {
      const get = (k: string[]) => getCol(d, k)

      let principal_value = 0
      try {
        principal_value = parsePtBrFloat(get(PAYABLE_MAPPINGS.principal_value))
      } catch {
        // ignore error
      }

      let amount = 0
      try {
        amount = parsePtBrFloat(get(PAYABLE_MAPPINGS.amount))
      } catch {
        // ignore error
      }

      // If principal is 0 but amount has value, use amount as principal
      if (principal_value === 0 && amount !== 0) principal_value = amount
      // If amount is 0 but principal has value, use principal as amount
      if (amount === 0 && principal_value !== 0) amount = principal_value

      let fine = 0
      try {
        fine = parsePtBrFloat(get(PAYABLE_MAPPINGS.fine))
      } catch {
        // ignore error
      }

      let interest = 0
      try {
        interest = parsePtBrFloat(get(PAYABLE_MAPPINGS.interest))
      } catch {
        // ignore error
      }

      let status = normalizeText(get(PAYABLE_MAPPINGS.status))
      if (!status || status.toLowerCase() === 'aberto') status = 'pending'
      else if (
        status.toLowerCase() === 'pago' ||
        status.toLowerCase() === 'liquidado'
      )
        status = 'paid'

      return {
        entity_name: normalizeText(get(PAYABLE_MAPPINGS.entity_name)),
        document_number: normalizeText(get(PAYABLE_MAPPINGS.document_number)),
        issue_date: get(PAYABLE_MAPPINGS.issue_date),
        due_date: get(PAYABLE_MAPPINGS.due_date),
        principal_value,
        fine,
        interest,
        amount,
        status,
        category: normalizeText(get(PAYABLE_MAPPINGS.category)) || 'Geral',
        description: normalizeText(get(PAYABLE_MAPPINGS.description)),
      }
    })

  const { data: result, error } = await supabase.rpc(
    'strict_replace_payables',
    {
      p_company_id: companyId,
      p_rows: sanitized,
    },
  )

  if (error) throw error
  return result as any
}

export async function fetchImportRejects(
  batchId: string,
  page = 1,
  pageSize = 20,
) {
  const { data, error } = await supabase.rpc('get_receivables_rejects', {
    p_batch_id: batchId,
    p_page: page,
    p_page_size: pageSize,
  })

  // The RPC returns { ..., total_count }[]
  const count = data && data.length > 0 ? data[0].total_count : 0

  return { data: data || [], count: count, error }
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

    let failures: any[] = []

    if (summary.rejected_rows > 0 && summary.batch_id) {
      try {
        const rejects = await fetchImportRejects(summary.batch_id, 1, 200)
        if (rejects.data) {
          failures = rejects.data.map((r: any) => ({
            row: r.row_number,
            reason: r.reason,
            data: r.raw_data,
          }))
        }
      } catch (e) {
        console.error('Error fetching rejects', e)
      }
    }

    return {
      success: true,
      message: `Processado: ${summary.imported_rows} inseridos`,
      stats: {
        records: summary.imported_rows,
        importedTotal: summary.imported_amount,
        fileTotal: summary.total_rows,
        fileTotalPrincipal: summary.total_amount,
        rejectedRows: summary.rejected_rows,
        rejectedAmount: summary.rejected_amount,
        batchId: summary.batch_id,
        auditDbRows: summary.audit_db_rows,
        auditDbValue: summary.audit_db_value,
      },
      failures,
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Erro ao processar importação',
      failures: [{ error: err.message }],
    }
  }
}

export async function importarPayables(
  userId: string,
  data: any[],
  fallbackCompanyId?: string,
): Promise<ImportResult> {
  if (!fallbackCompanyId || fallbackCompanyId === 'all')
    return { success: false, message: 'Selecione uma empresa', failures: [] }

  try {
    const summary = await importPayablesRobust(userId, fallbackCompanyId, data)

    return {
      success: true,
      message: `Processado: ${summary.inserted} registros inseridos, ${summary.deleted} removidos.`,
      stats: {
        records: summary.inserted,
        deleted: summary.deleted,
      },
      failures: [],
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Erro ao processar importação de pagáveis',
      failures: [{ error: err.message }],
    }
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

export const salvarPayableManual = async (
  payload: Partial<Transaction>,
  userId: string,
) => {
  if (!payload.company_id) throw new Error('Empresa é obrigatória')

  const dbPayload = {
    company_id: payload.company_id,
    type: 'payable',
    document_number: payload.document_number,
    entity_name: payload.entity_name,
    issue_date: payload.issue_date,
    due_date: payload.due_date,
    amount: payload.amount,
    principal_value: payload.principal_value,
    fine: payload.fine,
    interest: payload.interest,
    category: payload.category || 'Geral',
    status: payload.status || 'pending',
    description: payload.description,
  }

  if (payload.id) {
    const { data, error } = await supabase
      .from('transactions')
      .update(dbPayload)
      .eq('id', payload.id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } else {
    const { data, error } = await supabase
      .from('transactions')
      .insert(dbPayload)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  }
}

export const deletePayableTransaction = async (id: string) => {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

export const salvarReceivableManual = async (payload: any, userId: string) => {
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

export async function fetchBalanceHistory(
  companyId: string,
  page: number,
  pageSize: number,
  filters?: { startDate?: string; endDate?: string },
) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('bank_balances_v2')
    .select('*, banks(name, account_number)', { count: 'exact' })
    .eq('company_id', companyId)

  if (filters?.startDate) {
    query = query.gte('reference_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('reference_date', filters.endDate)
  }

  query = query
    .order('reference_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, count, error } = await query

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

export async function updateBankBalance(
  id: string,
  payload: {
    amount: number
    reference_date: string
    bank_id: string
  },
) {
  const { data, error } = await supabase
    .from('bank_balances_v2')
    .update({
      amount: payload.amount,
      reference_date: payload.reference_date,
      bank_id: payload.bank_id,
    })
    .eq('id', id)
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
