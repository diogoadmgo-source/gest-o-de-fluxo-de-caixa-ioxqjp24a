import { supabase } from '@/lib/supabase/client'
import { ProductImport, ProductImportFinancialTotals } from '@/lib/types'
import { parsePtBrFloat } from '@/lib/utils'

export async function fetchPaginatedProductImports(
  companyIds: string[],
  page: number,
  pageSize: number,
  filters: {
    search?: string
    status?: string
    dateRange?: { from: Date; to?: Date }
  },
) {
  let query = supabase
    .from('product_imports')
    .select('*', { count: 'exact' })
    .in('company_id', companyIds)

  // Filtering
  if (filters.status && filters.status !== 'all') {
    query = query.eq('clearance_status', filters.status)
  }

  if (filters.search) {
    const term = `%${filters.search}%`
    query = query.or(
      `process_number.ilike.${term},nf_number.ilike.${term},international_supplier.ilike.${term}`,
    )
  }

  if (filters.dateRange?.from) {
    const fromStr = filters.dateRange.from.toISOString().split('T')[0]
    const toStr = filters.dateRange.to
      ? filters.dateRange.to.toISOString().split('T')[0]
      : fromStr
    query = query.gte('due_date', fromStr).lte('due_date', toStr)
  }

  // Sorting - Updated to due_date ascending
  query = query.order('due_date', { ascending: true })

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) throw error
  return { data: (data as ProductImport[]) || [], count: count || 0 }
}

export async function getProductImportStats(
  companyId: string,
  dateRange?: { from: Date; to?: Date },
) {
  const fromStr = dateRange?.from
    ? dateRange.from.toISOString().split('T')[0]
    : null
  const toStr = dateRange?.to
    ? dateRange.to.toISOString().split('T')[0]
    : dateRange?.from
      ? dateRange.from.toISOString().split('T')[0]
      : null

  const { data, error } = await supabase.rpc('get_product_import_stats', {
    p_company_id: companyId,
    p_start_date: fromStr,
    p_end_date: toStr,
  })

  if (error) throw error
  return data as {
    status: string
    total_balance: number
    total_estimate: number
    count: number
  }[]
}

export async function getProductImportFinancialTotals(
  companyIds: string[],
  dateRange?: { from: Date; to?: Date },
  search?: string,
) {
  const fromStr = dateRange?.from
    ? dateRange.from.toISOString().split('T')[0]
    : null
  const toStr = dateRange?.to
    ? dateRange.to.toISOString().split('T')[0]
    : dateRange?.from
      ? dateRange.from.toISOString().split('T')[0]
      : null

  const { data, error } = await supabase.rpc(
    'get_product_import_financial_totals',
    {
      p_company_ids: companyIds,
      p_start_date: fromStr,
      p_end_date: toStr,
      p_search_term: search || null,
    },
  )

  if (error) throw error

  // RPC returns array of 1 object, use single() implicitly via array access
  const result = Array.isArray(data) && data.length > 0 ? data[0] : null

  return (result || {
    total_balance: 0,
    total_estimate_without_tax: 0,
    total_icms_tax: 0,
    total_final_estimate: 0,
  }) as ProductImportFinancialTotals
}

export async function saveProductImport(
  payload: Partial<ProductImport>,
  userId: string,
) {
  if (!payload.company_id) throw new Error('Empresa é obrigatória')

  const dbPayload = {
    company_id: payload.company_id,
    user_id: userId,
    process_number: payload.process_number,
    description: payload.description || '',
    international_supplier: payload.international_supplier || '',
    foreign_currency_value: payload.foreign_currency_value || 0,
    foreign_currency_code: payload.foreign_currency_code || 'USD',
    exchange_rate: payload.exchange_rate || 1,
    logistics_costs: payload.logistics_costs || 0,
    taxes: payload.taxes || 0,
    nationalization_costs: payload.nationalization_costs || 0,
    status: payload.status || 'Pending',
    start_date: payload.start_date || new Date().toISOString().split('T')[0],
    expected_arrival_date: payload.expected_arrival_date || null,
    actual_arrival_date: payload.actual_arrival_date || null,

    // New fields
    line: payload.line,
    situation: payload.situation,
    nf_number: payload.nf_number,
    balance: payload.balance || 0,
    due_date: payload.due_date || null,
    clearance_forecast_date: payload.clearance_forecast_date || null,
    estimate_without_tax: payload.estimate_without_tax || 0,
    icms_tax: payload.icms_tax || 0,
    final_clearance_estimate: payload.final_clearance_estimate || 0,
    clearance_status: payload.clearance_status,
  }

  if (payload.id) {
    const { data, error } = await supabase
      .from('product_imports')
      .update({ ...dbPayload, updated_at: new Date().toISOString() })
      .eq('id', payload.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('product_imports')
      .insert(dbPayload)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function deleteProductImport(id: string) {
  const { error } = await supabase.from('product_imports').delete().eq('id', id)
  if (error) throw error
}

export async function logImportAudit(
  action: string,
  id: string,
  userId: string,
  details: any,
) {
  await supabase.from('audit_logs').insert({
    action,
    entity: 'ProductImports',
    entity_id: id,
    user_id: userId,
    details,
  })
}

// Bulk Import
export async function importProductImports(
  userId: string,
  companyId: string,
  data: any[],
) {
  const rowsToInsert = data.map((row) => {
    // Optimized keys for lookup
    const rowKeys = Object.keys(row)

    // Map CSV columns with resilient trimming and case-insensitivity
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        const searchKey = k.trim().toLowerCase()
        const foundKey = rowKeys.find(
          (rk) => rk.trim().toLowerCase() === searchKey,
        )
        if (foundKey) return row[foundKey]
      }
      return undefined
    }

    const parseDate = (val: any) => {
      if (!val) return null
      if (val instanceof Date) return val.toISOString().split('T')[0]
      const str = String(val).trim()
      // DD/MM/YYYY
      if (str.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = str.split('/')
        return `${y}-${m}-${d}`
      }
      // YYYY-MM-DD
      if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str
      return null
    }

    // Mapping based on user story excel columns
    // Linha -> line
    const line = getVal(['linha', 'line', 'category'])
    // Invoice -> process_number
    const process_number = getVal([
      'invoice',
      'processo',
      'process',
      'process_number',
    ])
    // Fornecedor -> international_supplier
    const supplier = getVal([
      'fornecedor',
      'supplier',
      'international_supplier',
    ])
    // Situação -> situation
    const situation = getVal(['situação', 'situacao', 'situation'])
    // NF -> nf_number
    const nf_number = getVal(['nf', 'nota fiscal', 'nf_number'])
    // Saldo -> balance
    const balance = parsePtBrFloat(getVal(['saldo', 'balance']))
    // Vencimento -> due_date
    const due_date = parseDate(getVal(['vencimento', 'due_date']))
    // Previsão Desembaraço -> clearance_forecast_date
    const clearance_forecast_date = parseDate(
      getVal([
        'previsão desembaraço',
        'previsao desembaraco',
        'forecast',
        'clearance_forecast_date',
      ]),
    )
    // Estimativa sem Imposto (ICMS) -> estimate_without_tax
    const estimate_without_tax = parsePtBrFloat(
      getVal(['estimativa sem imposto', 'estimate_without_tax']),
    )
    // Incidência de ICMS -> icms_tax
    const icms_tax = parsePtBrFloat(
      getVal(['incidência de icms', 'incidencia de icms', 'icms', 'icms_tax']),
    )
    // Estimativa Valor Desembaraço Final -> final_clearance_estimate
    const final_clearance_estimate = parsePtBrFloat(
      getVal([
        'estimativa valor desembaraço final',
        'final_estimate',
        'final_clearance_estimate',
      ]),
    )
    // Status Desembaraço -> clearance_status
    const clearance_status = getVal([
      'status desembaraço',
      'status desembaraco',
      'clearance_status',
    ])

    const description =
      getVal(['descrição', 'descricao', 'description']) ||
      process_number ||
      'Importação via CSV'

    // Fallbacks/Defaults
    const start_date =
      parseDate(getVal(['inicio', 'start_date'])) ||
      new Date().toISOString().split('T')[0]

    return {
      company_id: companyId,
      user_id: userId,
      process_number: process_number ? String(process_number).trim() : null,
      description: String(description).substring(0, 255),
      international_supplier: supplier
        ? String(supplier).trim()
        : 'Fornecedor Desconhecido',
      foreign_currency_value: 0, // Legacy, can keep 0 if not provided
      foreign_currency_code: 'USD',
      exchange_rate: 1,
      logistics_costs: 0,
      taxes: 0,
      nationalization_costs: 0,
      status: 'Pending', // Legacy status
      start_date,

      line: line ? String(line).trim() : null,
      situation: situation ? String(situation).trim() : null,
      nf_number: nf_number ? String(nf_number).trim() : null,
      balance,
      due_date,
      clearance_forecast_date,
      estimate_without_tax,
      icms_tax,
      final_clearance_estimate,
      clearance_status: clearance_status
        ? String(clearance_status).trim()
        : null,
    }
  })

  // Insert in chunks to avoid payload limits
  const chunkSize = 100
  let insertedCount = 0
  let errors: any[] = []

  for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
    const chunk = rowsToInsert.slice(i, i + chunkSize)
    const { error } = await supabase.from('product_imports').insert(chunk)
    if (error) {
      errors.push(error.message)
    } else {
      insertedCount += chunk.length
    }
  }

  if (errors.length > 0 && insertedCount === 0) {
    throw new Error(`Falha na importação: ${errors.join(', ')}`)
  }

  return {
    success: true,
    message: `Importado ${insertedCount} registros com sucesso.`,
    stats: {
      records: insertedCount,
      importedTotal: 0,
      rejectedRows: errors.length > 0 ? rowsToInsert.length - insertedCount : 0,
    },
  }
}
