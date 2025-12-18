import { supabase } from '@/lib/supabase/client'
import { AuditLog } from '@/lib/types'

export async function fetchAuditLogs(
  page: number,
  pageSize: number,
  filters?: any,
) {
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }

  const { data, count, error } = await query
  if (error) throw error

  return { data: data as AuditLog[], count: count || 0 }
}

export async function getDataIsolationStats(companyId: string) {
  const { data, error } = await supabase.rpc('get_data_isolation_audit', {
    p_company_id: companyId,
  })

  if (error) throw error
  return data
}
