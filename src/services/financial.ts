import { supabase } from '@/lib/supabase/client'
import { parse, isValid, format } from 'date-fns'
import { performanceMonitor } from '@/lib/performance'

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
  }
  failures: any[]
}

// --- Fetching Helpers (Optimized with Logging) ---

export async function fetchPaginatedReceivables(
  companyId: string,
  page: number,
  pageSize: number,
  filters: {
    status?: string
    search?: string
    dateRange?: { from: Date; to: Date }
    issueDateRange?: { from: Date; to: Date }
    createdAtRange?: { from: Date; to: Date }
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
            .lt('due_date', new Date().toISOString())
        } else if (filters.status === 'a_vencer') {
          query = query
            .eq('title_status', 'Aberto')
            .gte('due_date', new Date().toISOString())
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
      if (filters.dateRange?.from && filters.dateRange?.to) {
        query = query
          .gte('due_date', filters.dateRange.from.toISOString())
          .lte('due_date', filters.dateRange.to.toISOString())
      }

      // Issue Date Range Filter
      if (filters.issueDateRange?.from && filters.issueDateRange?.to) {
        query = query
          .gte('issue_date', filters.issueDateRange.from.toISOString())
          .lte('issue_date', filters.issueDateRange.to.toISOString())
      }

      // Created At Range Filter
      if (filters.createdAtRange?.from && filters.createdAtRange?.to) {
        query = query
          .gte('created_at', filters.createdAtRange.from.toISOString())
          .lte('created_at', filters.createdAtRange.to.toISOString())
      }

      // Sorting
      const sortCol = filters.sortBy || 'due_date'
      query = query.order(sortCol, { ascending: filters.sortOrder === 'asc' })

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
    dateRange?: { from: Date; to: Date }
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
        if (filters.status === 'overdue') {
          query = query
            .eq('status', 'pending')
            .lt('due_date', new Date().toISOString())
        } else if (filters.status === 'upcoming') {
          query = query
            .eq('status', 'pending')
            .gte('due_date', new Date().toISOString())
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

      if (filters.dateRange?.from && filters.dateRange?.to) {
        query = query
          .gte('due_date', filters.dateRange.from.toISOString())
          .lte('due_date', filters.dateRange.to.toISOString())
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

// RPC Wrappers
export async function getDashboardKPIs(companyId: string) {
  return performanceMonitor.measurePromise(
    'dashboard',
    'get_kpis',
    (async () => {
      const { data, error } = await supabase.rpc('get_dashboard_kpis', {
        p_company_id: companyId,
      })
      if (error) throw error
      return data
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

  // Handle currency symbols
  str = str.replace(/^R\$\s?/, '').replace(/\s/g, '')

  // Check format
  const lastComma = str.lastIndexOf(',')
  const lastDot = str.lastIndexOf('.')

  if (lastComma > lastDot) {
    // BR Format: remove dots, replace comma with dot
    str = str.replace(/\./g, '').replace(',', '.')
  } else {
    // US Format: remove commas
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

  // Try parsing common formats
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

export async function upsertBankBalance(payload: any) {
  const { data, error } = await supabase
    .from('bank_balances_v2')
    .upsert(payload, { onConflict: 'company_id,bank_id,reference_date' })
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

// Imports
export async function importarReceivables(
  companyId: string,
  data: any[],
): Promise<ImportResult> {
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

  const mappedData = data
    .map((row: any) => ({
      invoice_number: normalizeText(
        getCol(row, [
          'Nota Fiscal',
          'NF',
          'Documento',
          'invoice_number',
          'Doc',
          'Nº Nota',
        ]),
      ),
      order_number: normalizeText(
        getCol(row, ['Pedido', 'order_number', 'PO', 'Ped']),
      ),
      customer: normalizeText(
        getCol(row, [
          'Cliente',
          'Nome Fantasia',
          'customer',
          'Nome',
          'Razão Social',
        ]),
      ),
      customer_name: normalizeText(
        getCol(row, ['Razão Social', 'Nome Cliente', 'Nome', 'customer_name']),
      ),
      customer_doc: normalizeText(
        getCol(row, [
          'CNPJ',
          'CPF',
          'Documento Cliente',
          'customer_doc',
          'CNPJ/CPF',
          'Doc Cliente',
        ]),
      ),
      issue_date: d(
        getCol(row, [
          'Emissão',
          'Data Emissão',
          'issue_date',
          'Data de Emissão',
          'Dt Emissão',
        ]),
      ),
      due_date: d(
        getCol(row, [
          'Vencimento',
          'Data Vencimento',
          'due_date',
          'Data de Vencimento',
          'Dt Vencimento',
          'Vcto',
        ]),
      ),
      payment_prediction: d(
        getCol(row, [
          'Previsão',
          'Data Previsão',
          'payment_prediction',
          'Prev. Pagto',
          'Previsão Pagto',
        ]),
      ),
      principal_value: n(
        getCol(row, [
          'Valor',
          'Valor Original',
          'Principal',
          'principal_value',
          'Valor Título',
          'Valor Liquido',
          'Valor Líquido',
          'Valor Total',
        ]),
      ),
      fine: n(getCol(row, ['Multa', 'fine'])),
      interest: n(getCol(row, ['Juros', 'interest'])),
      updated_value: n(
        getCol(row, [
          'Valor Atualizado',
          'Valor Total',
          'updated_value',
          'Saldo',
          'Total',
        ]),
      ),
      title_status: normalizeText(
        getCol(row, [
          'Status',
          'Situação',
          'title_status',
          'Estado',
          'Status Título',
        ]),
      ),
      new_status: normalizeText(
        getCol(row, [
          'Novo Status',
          'Status Secundário',
          'new_status',
          'Sub Status',
        ]),
      ),
      seller: normalizeText(getCol(row, ['Vendedor', 'seller', 'Comercial'])),
      customer_code: normalizeText(
        getCol(row, ['Cod Cliente', 'Código', 'customer_code', 'Cód.', 'Cod.']),
      ),
      uf: normalizeText(getCol(row, ['UF', 'uf', 'Estado'])),
      regional: normalizeText(getCol(row, ['Regional', 'regional'])),
      installment: normalizeText(getCol(row, ['Parcela', 'installment'])),
      days_overdue: n(getCol(row, ['Dias Atraso', 'days_overdue', 'Atraso'])),
      utilization: normalizeText(
        getCol(row, ['Utilização', 'Uso', 'utilization']),
      ),
      negativado: normalizeText(getCol(row, ['Negativado', 'negativado'])),
      description: normalizeText(
        getCol(row, ['Descrição', 'Obs', 'description', 'Histórico']),
      ),
    }))
    .filter((r) => r.customer)

  if (mappedData.length === 0) {
    return {
      success: false,
      message: 'Nenhum registro válido encontrado no arquivo.',
      failures: [],
    }
  }

  // Client-side deduplication to reduce load and network traffic
  const uniqueRows = new Map()
  let duplicateCount = 0

  mappedData.forEach((row) => {
    // Treat empty strings as potentially matching nulls or empty strings
    // Key matches the Unique Constraint: company_id + invoice + order + installment + principal
    const key = `${row.invoice_number || ''}|${row.order_number || ''}|${row.installment || ''}|${row.principal_value}`

    if (uniqueRows.has(key)) {
      duplicateCount++
    } else {
      uniqueRows.set(key, row)
    }
  })

  const cleanData = Array.from(uniqueRows.values())

  const { data: result, error } = await supabase.rpc(
    'strict_replace_receivables',
    {
      p_company_id: companyId,
      p_rows: cleanData,
    },
  )

  if (error) {
    console.error('RPC Error:', error)
    return {
      success: false,
      message: error.message || 'Erro de conexão.',
      failures: [],
    }
  }

  const rpcResponse = result as any
  if (!rpcResponse.success) {
    return {
      success: false,
      message: rpcResponse.error || 'Erro no processamento.',
      failures: [],
    }
  }

  const stats = rpcResponse.stats
  const totalSkipped = duplicateCount + (stats?.skipped || 0)

  return {
    success: true,
    message:
      totalSkipped > 0
        ? `Importação realizada. ${totalSkipped} duplicatas removidas.`
        : 'Importação realizada com sucesso.',
    stats: {
      records: stats?.inserted || 0,
      importedTotal: stats?.inserted_amount || 0,
      fileTotal: 0,
      fileTotalPrincipal: 0,
      importedPrincipal: 0,
      failuresTotal: 0,
      duplicatesSkipped: totalSkipped,
    },
    failures: [],
  }
}

export const importarPayables = async (): Promise<ImportResult> => ({
  success: false,
  message: 'Não implementado',
  failures: [],
})

export const salvarBankManual = async (p: any, u: string) => {
  return { id: '1', ...p }
}
export const salvarImportLogManual = async (p: any, u: string) => {
  return { id: '1', ...p }
}
