import { supabase } from '@/lib/supabase/client'
import { ProductImport } from '@/lib/types'

// Updated to support server-side pagination and filtering
export async function fetchPaginatedProductImports(
  companyIds: string[],
  page: number,
  pageSize: number,
  filters: {
    search?: string
    status?: string
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
    expected_arrival_date: payload.expected_arrival_date,
    actual_arrival_date: payload.actual_arrival_date,
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
