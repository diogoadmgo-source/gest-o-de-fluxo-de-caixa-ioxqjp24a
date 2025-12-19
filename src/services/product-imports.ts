import { supabase } from '@/lib/supabase/client'
import { ProductImport } from '@/lib/types'
import { parsePtBrFloat } from '@/lib/utils'

// Updated to support server-side pagination and filtering
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
    query = query.eq('status', filters.status)
  }

  if (filters.search) {
    const term = `%${filters.search}%`
    query = query.or(
      `description.ilike.${term},international_supplier.ilike.${term},process_number.ilike.${term}`,
    )
  }

  if (filters.dateRange?.from) {
    const fromStr = filters.dateRange.from.toISOString().split('T')[0]
    const toStr = filters.dateRange.to
      ? filters.dateRange.to.toISOString().split('T')[0]
      : fromStr
    query = query.gte('start_date', fromStr).lte('start_date', toStr)
  }

  // Sorting
  query = query.order('created_at', { ascending: false })

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) throw error
  return { data: (data as ProductImport[]) || [], count: count || 0 }
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
    description: payload.description,
    international_supplier: payload.international_supplier,
    foreign_currency_value: payload.foreign_currency_value,
    foreign_currency_code: payload.foreign_currency_code,
    exchange_rate: payload.exchange_rate,
    logistics_costs: payload.logistics_costs || 0,
    taxes: payload.taxes || 0,
    nationalization_costs: payload.nationalization_costs || 0,
    status: payload.status,
    start_date: payload.start_date,
    expected_arrival_date: payload.expected_arrival_date || null,
    actual_arrival_date: payload.actual_arrival_date || null,
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
    // Map CSV columns
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        // Case insensitive check
        const foundKey = Object.keys(row).find(
          (rk) => rk.toLowerCase() === k.toLowerCase(),
        )
        if (foundKey) return row[foundKey]
      }
      return undefined
    }

    const description =
      getVal(['description', 'descrição', 'produto']) || 'Importação via CSV'
    const supplier =
      getVal(['international_supplier', 'fornecedor', 'supplier']) ||
      'Fornecedor Desconhecido'
    const valueStr = getVal([
      'foreign_currency_value',
      'valor',
      'value',
      'amount',
    ])
    const rateStr = getVal(['exchange_rate', 'taxa', 'cambio', 'rate'])
    const taxesStr = getVal(['taxes', 'impostos', 'tax'])
    const logisticsStr = getVal(['logistics_costs', 'logistica', 'frete'])
    const nationalizationStr = getVal([
      'nationalization_costs',
      'nacionalizacao',
      'custos',
    ])

    // Date parsing helper
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

    const start_date =
      parseDate(getVal(['start_date', 'data inicio', 'inicio', 'data'])) ||
      new Date().toISOString().split('T')[0]
    const expected = parseDate(
      getVal(['expected_arrival_date', 'previsao', 'chegada prevista']),
    )
    const actual = parseDate(
      getVal(['actual_arrival_date', 'chegada', 'chegada real']),
    )

    return {
      company_id: companyId,
      user_id: userId,
      process_number: getVal(['process_number', 'processo', 'numero']) || '',
      description: String(description).substring(0, 255),
      international_supplier: String(supplier).substring(0, 255),
      foreign_currency_value: parsePtBrFloat(valueStr),
      foreign_currency_code:
        getVal(['foreign_currency_code', 'moeda', 'currency']) || 'USD',
      exchange_rate: parsePtBrFloat(rateStr) || 1,
      logistics_costs: parsePtBrFloat(logisticsStr),
      taxes: parsePtBrFloat(taxesStr),
      nationalization_costs: parsePtBrFloat(nationalizationStr),
      status: getVal(['status', 'situacao']) || 'Pending',
      start_date,
      expected_arrival_date: expected,
      actual_arrival_date: actual,
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
