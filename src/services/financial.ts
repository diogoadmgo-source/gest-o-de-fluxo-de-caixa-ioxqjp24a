import { supabase } from '@/lib/supabase/client'
import { parse, isValid, format } from 'date-fns'
import { performanceMonitor } from '@/lib/performance'
import { isGarbageCompany } from '@/lib/utils'
import { ImportBatchSummary, ImportReject, KPI } from '@/lib/types'

// --- Types ---
export interface PaginatedResult<T> {
  data: T[]
  count: number
  error: any
}

export interface ImportResult {
  success: boolean
  message: string
  stats?: {
    records: number
    importedTotal: number
    fileTotal: number
    fileTotalPrincipal: number
    importedPrincipal: number
    failuresTotal: number
    duplicatesSkipped?: number
    // Integrity Stats
    batchId?: string
    rejectedRows?: number
    rejectedAmount?: number
  }
  failures: any[]
}

// --- Mappings & Validation Definitions ---

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
    'Vencimento',
    'Data Vencimento',
    'due_date',
    'Data de Vencimento',
    'Vcto',
    'Dt Vencimento',
  ],
  principal_value: [
    'Valor Principal',
    'Valor',
    'Principal',
    'principal_value',
    'Valor Original',
    'Vlr Principal',
    'Valor do Título',
  ],
  fine: ['Multa', 'fine', 'Vlr Multa'],
  interest: ['Juros', 'interest', 'Vlr Juros'],
  updated_value: [
    'Valor Atualizado',
    'updated_value',
    'Valor Total',
    'Vlr Atualizado',
    'Total',
  ],
  installment: ['Parcela', 'installment', 'Parc'],
  title_status: ['Status', 'title_status', 'Situação'],
  description: ['Descrição', 'Observação', 'description', 'Obs', 'Histórico'],
  company: ['Empresa', 'Company', 'Loja', 'Unidade', 'Filial'],
  // Extra fields
  payment_prediction: [
    'Previsão',
    'payment_prediction',
    'Previsão Pagto',
    'Data Previsão',
  ],
  seller: ['Vendedor', 'seller', 'Representante'],
  customer_code: ['Cod Cliente', 'customer_code', 'Código Cliente'],
  uf: ['UF', 'uf', 'Estado'],
  regional: ['Regional', 'regional'],
  days_overdue: ['Dias Atraso', 'days_overdue', 'Atraso'],
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

function validateReceivablesLayout(row: any): string[] {
  const missing: string[] = []
  for (const field of REQUIRED_FIELDS) {
    const mapping = (RECEIVABLE_MAPPINGS as any)[field.key]
    if (getCol(row, mapping) === undefined) {
      missing.push(field.label)
    }
  }
  return missing
}

// ... existing fetch helpers ...
export async function fetchPaginatedReceivables(
  companyId: string,
  page: number,
  pageSize: number,
  filters: {
    status?: string
    search?: string
    dateRange?: { from: Date; to?: Date }
    issueDateRange?: { from: Date; to?: Date }
    createdAtRange?: { from: Date; to?: Date }
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  },
): Promise<PaginatedResult<any>> {
  return performanceMonitor.measurePromise(
    '/receivables',
    'fetch_paginated',
    (async () => {
      // MANDATORY: Strict company_id filter
      let query = supabase
        .from('receivables')
        .select(
          'id, invoice_number, order_number, customer, customer_name, principal_value, updated_value, due_date, issue_date, title_status, new_status, days_overdue, uf, installment, fine, interest',
          { count: 'exact' },
        )
        .eq('company_id', companyId)

      // Status Filters
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

      // Search Filter
      if (filters.search) {
        const term = `%${filters.search}%`
        query = query.or(
          `customer.ilike.${term},invoice_number.ilike.${term},order_number.ilike.${term},customer_name.ilike.${term}`,
        )
      }

      // Due Date Range Filter
      if (filters.dateRange?.from) {
        const fromStr = format(filters.dateRange.from, 'yyyy-MM-dd')
        const toStr = filters.dateRange.to
          ? format(filters.dateRange.to, 'yyyy-MM-dd')
          : fromStr
        query = query.gte('due_date', fromStr).lte('due_date', toStr)
      }

      // Issue Date Range Filter
      if (filters.issueDateRange?.from) {
        const fromStr = format(filters.issueDateRange.from, 'yyyy-MM-dd')
        const toStr = filters.issueDateRange.to
          ? format(filters.issueDateRange.to, 'yyyy-MM-dd')
          : fromStr
        query = query.gte('issue_date', fromStr).lte('issue_date', toStr)
      }

      // Created At Range Filter
      if (filters.createdAtRange?.from) {
        const fromStr = filters.createdAtRange.from.toISOString()
        const toDate = filters.createdAtRange.to || filters.createdAtRange.from
        const toStr = new Date(
          toDate.getFullYear(),
          toDate.getMonth(),
          toDate.getDate(),
          23,
          59,
          59,
          999,
        ).toISOString()
        query = query.gte('created_at', fromStr).lte('created_at', toStr)
      }

      // Sorting - AC 5: Default sorting by due_date (ASC)
      const sortCol = filters.sortBy || 'due_date'
      query = query
        .order(sortCol, { ascending: filters.sortOrder === 'asc' })
        .order('invoice_number', { ascending: true })

      // Pagination
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
  filters: {
    status?: string
    search?: string
    supplier?: string
    dateRange?: { from: Date; to?: Date }
  },
): Promise<PaginatedResult<any>> {
  return performanceMonitor.measurePromise(
    '/payables',
    'fetch_paginated',
    (async () => {
      let query = supabase
        .from('transactions')
        .select(
          'id, document_number, entity_name, amount, principal_value, due_date, issue_date, status, fine, interest, category, description, company_id',
          { count: 'exact' },
        )
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

      if (filters.supplier) {
        query = query.ilike('entity_name', `%${filters.supplier}%`)
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

export async function getReceivablesDashboardStats(companyId: string) {
  return performanceMonitor.measurePromise(
    'receivables',
    'get_stats',
    (async () => {
      const { data, error } = await supabase.rpc(
        'get_receivables_dashboard_stats',
        {
          p_company_id: companyId,
        },
      )
      if (error) throw error
      return data
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

// Helpers
export function normalizeText(text: any): string {
  if (text === null || text === undefined) return ''
  return String(text).trim().replace(/^"|"$/g, '')
}

export function n(value: any): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  let str = String(value).trim()

  str = str.replace(/^R\$\s?/, '').replace(/\s/g, '')
  const lastComma = str.lastIndexOf(',')
  const lastDot = str.lastIndexOf('.')

  if (lastComma > lastDot) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else {
    str = str.replace(/,/g, '')
  }

  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
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

  if (isGarbageCompany(val)) {
    throw new Error(
      `A criação de empresas com o nome "${val}" está bloqueada por política de segurança.`,
    )
  }

  const { data, error } = await supabase.rpc('ensure_company_and_link_user', {
    p_user_id: userId,
    p_company_name: val,
  })
  if (error) throw error
  if (!data) throw new Error('Falha crítica: ID da empresa não retornado.')
  return data as string
}

export async function getVisibleCompanyIds(
  supabaseClient: any,
  userId: string,
  selectedCompanyId: string | null,
) {
  if (selectedCompanyId && selectedCompanyId !== 'all')
    return [selectedCompanyId]
  const { data } = await supabaseClient
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
  return data?.map((i: any) => i.company_id) || []
}

// Writes
export async function salvarReceivableManual(payload: any, userId: string) {
  const companyId = await ensureCompanyAndLink(
    userId,
    payload.company_id || payload.company,
  )
  const dbPayload = {
    company_id: companyId,
    invoice_number: payload.invoice_number,
    customer: payload.customer,
    principal_value: payload.principal_value,
    title_status: payload.title_status || 'Aberto',
    updated_value: payload.updated_value || payload.principal_value,
    due_date: d(payload.due_date),
    issue_date: d(payload.issue_date),
    fine: payload.fine,
    interest: payload.interest,
    description: payload.description,
    order_number: payload.order_number,
    customer_code: payload.customer_code,
    customer_doc: payload.customer_doc,
    customer_name: payload.customer_name,
    new_status: payload.new_status,
    regional: payload.regional,
    seller: payload.seller,
    uf: payload.uf,
    installment: payload.installment,
    utilization: payload.utilization,
    days_overdue: payload.days_overdue,
    negativado: payload.negativado,
    payment_prediction: d(payload.payment_prediction),
  }
  if (payload.id) {
    return supabase
      .from('receivables')
      .update(dbPayload)
      .eq('id', payload.id)
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  } else {
    return supabase
      .from('receivables')
      .insert(dbPayload)
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  }
}

export async function salvarPayableManual(payload: any, userId: string) {
  const companyId = await ensureCompanyAndLink(
    userId,
    payload.company_id || payload.company,
  )
  const dbPayload = {
    company_id: companyId,
    entity_name: payload.entity_name,
    document_number: payload.document_number,
    amount: payload.amount,
    type: 'payable',
    status: payload.status || 'pending',
    due_date: d(payload.due_date),
    issue_date: d(payload.issue_date),
    category: payload.category,
    description: payload.description,
    principal_value: payload.principal_value,
    fine: payload.fine,
    interest: payload.interest,
  }
  if (payload.id) {
    return supabase
      .from('transactions')
      .update(dbPayload)
      .eq('id', payload.id)
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  } else {
    return supabase
      .from('transactions')
      .insert(dbPayload)
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        return data
      })
  }
}

export async function upsertBankBalance(payload: {
  company_id: string
  bank_id: string
  reference_date: string
  amount: number
}) {
  const { data, error } = await supabase
    .from('bank_balances')
    .upsert(payload, { onConflict: 'company_id,bank_id,reference_date' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBankBalance(id: string) {
  const { error } = await supabase.from('bank_balances').delete().eq('id', id)
  if (error) throw error
}

export async function fetchAllRecords(
  client: any,
  table: string,
  ids: string[],
  filter?: any,
) {
  let query = client.from(table).select('*')
  if (ids.length) query = query.in('company_id', ids)
  if (filter) query = filter(query)
  const { data } = await query.limit(1000)
  return data || []
}

// Imports Helpers
const getCol = (row: any, keys: string[]) => {
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

// --- NEW ROBUST IMPORT IMPLEMENTATION ---
export async function importReceivablesRobust(
  userId: string,
  companyId: string,
  data: any[],
  fileName: string,
): Promise<ImportBatchSummary> {
  // Normalize fields slightly before sending to ensure JSON integrity,
  // but let SQL handle validation.
  // AC 6: Company Isolation - We do NOT map 'company' column here.
  // We strictly use the companyId passed to this function.
  const sanitized = data.map((d) => {
    // Helper to try and get keys regardless of case
    const get = (k: string[]) => getCol(d, k)
    return {
      invoice_number: normalizeText(get(RECEIVABLE_MAPPINGS.invoice_number)),
      order_number: normalizeText(get(RECEIVABLE_MAPPINGS.order_number)),
      customer: normalizeText(get(RECEIVABLE_MAPPINGS.customer)),
      customer_doc: normalizeText(get(RECEIVABLE_MAPPINGS.customer_doc)),
      issue_date: get(RECEIVABLE_MAPPINGS.issue_date),
      due_date: get(RECEIVABLE_MAPPINGS.due_date),
      payment_prediction: get(RECEIVABLE_MAPPINGS.payment_prediction),
      principal_value: get(RECEIVABLE_MAPPINGS.principal_value),
      fine: get(RECEIVABLE_MAPPINGS.fine),
      interest: get(RECEIVABLE_MAPPINGS.interest),
      updated_value: get(RECEIVABLE_MAPPINGS.updated_value),
      title_status: normalizeText(get(RECEIVABLE_MAPPINGS.title_status)),
      seller: normalizeText(get(RECEIVABLE_MAPPINGS.seller)),
      customer_code: normalizeText(get(RECEIVABLE_MAPPINGS.customer_code)),
      uf: normalizeText(get(RECEIVABLE_MAPPINGS.uf)),
      regional: normalizeText(get(RECEIVABLE_MAPPINGS.regional)),
      installment: normalizeText(get(RECEIVABLE_MAPPINGS.installment)),
      days_overdue: get(RECEIVABLE_MAPPINGS.days_overdue),
      utilization: normalizeText(get(RECEIVABLE_MAPPINGS.utilization)),
      negativado: normalizeText(get(RECEIVABLE_MAPPINGS.negativado)),
      description: normalizeText(get(RECEIVABLE_MAPPINGS.description)),
      customer_name: normalizeText(get(RECEIVABLE_MAPPINGS.customer_name)),
      new_status: normalizeText(get(RECEIVABLE_MAPPINGS.new_status)),
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
  return result as ImportBatchSummary
}

export async function fetchImportRejects(
  batchId: string,
  page: number = 1,
  pageSize: number = 20,
) {
  const { data, error } = await supabase
    .from('import_receivables_rejects')
    .select('*', { count: 'exact' })
    .eq('batch_id', batchId)
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) throw error
  return {
    data: data as ImportReject[],
    count: count || 0,
  }
}

// Updated importarReceivables to use Robust logic and strictly require company context
export async function importarReceivables(
  userId: string,
  data: any[],
  fallbackCompanyId?: string,
  fileName: string = 'import.csv',
): Promise<ImportResult> {
  // STRICT GOVERNANCE (AC 6): Force company selection
  if (!fallbackCompanyId || fallbackCompanyId === 'all') {
    return {
      success: false,
      message:
        'Erro de Governança: Uma empresa deve ser selecionada para realizar a importação.',
      failures: [],
    }
  }

  // 0. Validate Layout (AC 2/7 Pre-check)
  if (data && data.length > 0) {
    const missingColumns = validateReceivablesLayout(data[0])
    if (missingColumns.length > 0) {
      return {
        success: false,
        message: `Layout inválido. Colunas obrigatórias não encontradas: ${missingColumns.join(', ')}.`,
        failures: [],
      }
    }
  }

  let totalInserted = 0
  let totalInsertedAmount = 0
  let totalRejectedAmount = 0
  let totalFileAmount = 0
  let totalDuplicatesSkipped = 0
  let lastBatchId: string | undefined
  let globalFailures: any[] = []

  try {
    // CALL NEW ROBUST RPC for strict replacement on the selected company
    const summary = await importReceivablesRobust(
      userId,
      fallbackCompanyId,
      data,
      fileName,
    )

    if (summary.success) {
      totalInserted = summary.imported_rows
      totalInsertedAmount = summary.imported_amount
      totalDuplicatesSkipped = summary.rejected_rows
      totalFileAmount = summary.total_value || 0
      totalRejectedAmount = summary.rejected_value || 0
      lastBatchId = summary.batch_id
    } else {
      globalFailures.push({ company: fallbackCompanyId, error: 'RPC Failed' })
    }
  } catch (err: any) {
    console.error(`Exception processing import:`, err)
    return {
      success: false,
      message: err.message || 'Falha desconhecida no processamento do arquivo.',
      failures: [{ error: err.message }],
    }
  }

  return {
    success: totalInserted > 0 || totalDuplicatesSkipped > 0, // Success even if all rejected, as long as process ran
    message: `Processado com sucesso. ${totalInserted} registros inseridos. ${totalDuplicatesSkipped} rejeitados/duplicados.`,
    stats: {
      records: totalInserted,
      importedTotal: totalInsertedAmount,
      fileTotal: data.length,
      fileTotalPrincipal: totalFileAmount,
      importedPrincipal: totalInsertedAmount,
      failuresTotal: globalFailures.length,
      duplicatesSkipped: totalDuplicatesSkipped,
      batchId: lastBatchId,
      rejectedRows: totalDuplicatesSkipped,
      rejectedAmount: totalRejectedAmount,
    },
    failures: globalFailures,
  }
}

export const importarPayables = async (
  userId: string,
  data: any[],
  fallbackCompanyId?: string,
): Promise<ImportResult> => {
  const companyGroups = new Map<string, any[]>()
  let totalRecordsProcessed = 0
  let globalFailures: any[] = []
  let totalInserted = 0
  let totalInsertedAmount = 0

  // 1. Group data
  for (const row of data) {
    const companyName = normalizeText(
      getCol(row, ['Empresa', 'Company', 'Loja', 'Unidade', 'company']),
    )

    let targetCompany = companyName
    if (!targetCompany && fallbackCompanyId) {
      targetCompany = fallbackCompanyId
    }

    if (!targetCompany) continue

    if (!companyGroups.has(targetCompany)) {
      companyGroups.set(targetCompany, [])
    }
    companyGroups.get(targetCompany)?.push(row)
  }

  if (companyGroups.size === 0) {
    return {
      success: false,
      message: 'Nenhuma empresa identificada e nenhuma selecionada.',
      failures: [],
    }
  }

  // 2. Process
  for (const [companyNameOrId, rows] of companyGroups.entries()) {
    try {
      let companyId = companyNameOrId
      if (
        !companyNameOrId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        companyId = await ensureCompanyAndLink(userId, companyNameOrId)
      }

      const mappedData = rows
        .map((row: any) => ({
          entity_name: normalizeText(
            getCol(row, ['Fornecedor', 'Nome', 'entity_name']),
          ),
          document_number: normalizeText(
            getCol(row, [
              'Documento',
              'Nota Fiscal',
              'NF',
              'document_number',
              'Doc',
            ]),
          ),
          issue_date: d(
            getCol(row, ['Emissão', 'Data Emissão', 'issue_date', 'Data']),
          ),
          due_date: d(
            getCol(row, [
              'Vencimento',
              'Data Vencimento',
              'due_date',
              'Vcto',
              'Data Vencto',
            ]),
          ),
          amount: n(
            getCol(row, [
              'Valor',
              'Total',
              'Valor Total',
              'amount',
              'Valor Líquido',
            ]),
          ),
          principal_value: n(
            getCol(row, ['Valor Principal', 'Principal', 'principal_value']),
          ),
          fine: n(getCol(row, ['Multa', 'fine'])),
          interest: n(getCol(row, ['Juros', 'interest'])),
          status: normalizeText(
            getCol(row, ['Status', 'Situação', 'status', 'Estado']),
          ),
          category: normalizeText(
            getCol(row, ['Categoria', 'category', 'Classificação']),
          ),
          description: normalizeText(
            getCol(row, ['Descrição', 'Obs', 'description', 'Histórico']),
          ),
        }))
        .filter((r: any) => r.entity_name && !isGarbageCompany(r.entity_name))

      if (mappedData.length === 0) continue

      const { data: result, error } = await supabase.rpc(
        'strict_replace_payables',
        {
          p_company_id: companyId,
          p_rows: mappedData,
        },
      )

      if (error) {
        globalFailures.push({ company: companyNameOrId, error: error.message })
        continue
      }

      const rpcResponse = result as any
      if (!rpcResponse.success) {
        globalFailures.push({
          company: companyNameOrId,
          error: rpcResponse.error,
        })
        continue
      }

      totalInserted += rpcResponse.inserted || 0
      totalInsertedAmount += rpcResponse.inserted_amount || 0
    } catch (err: any) {
      globalFailures.push({ company: companyNameOrId, error: err.message })
    }
  }

  return {
    success: totalInserted > 0 || globalFailures.length === 0,
    message: 'Importação de contas a pagar realizada com sucesso.',
    stats: {
      records: totalInserted,
      importedTotal: totalInsertedAmount,
      fileTotal: 0,
      fileTotalPrincipal: 0,
      importedPrincipal: 0,
      failuresTotal: globalFailures.length,
      duplicatesSkipped: 0,
    },
    failures: globalFailures,
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

export const salvarImportLogManual = async (payload: any, userId: string) => {
  const { data, error } = await supabase
    .from('import_logs')
    .insert({
      ...payload,
      user_id: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
