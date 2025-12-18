import { supabase } from '@/lib/supabase/client'
import { parse, isValid, format } from 'date-fns'

// --- Normalization Helpers ---

export function normalizeText(text: any): string {
  if (text === null || text === undefined) return ''
  return String(text).trim()
}
// Alias for backward compatibility
export const s = normalizeText

export function n(value: any): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  let str = String(value).trim()

  // Remove currency symbols (e.g., R$, $) and any other non-numeric chars except digits, dot, comma, minus
  // This helps cleaning "R$ 1.234,56" to "1.234,56"
  str = str.replace(/[^\d.,-]/g, '')

  if (!str) return 0

  // Handle Brazilian format (dots as thousands separators, comma as decimal)
  // "1.234,56" -> "1234.56"
  // If we just remove dots and replace comma with dot, we cover most BR cases.
  const cleanStr = str.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleanStr)
  return isNaN(num) ? 0 : num
}

export function d(value: any): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (typeof value === 'number') {
    // Excel date handling
    const excelDate = new Date((value - 25569) * 86400 * 1000)
    if (isValid(excelDate)) return excelDate.toISOString().split('T')[0]
  }
  const str = String(value).trim()

  // Try parsing various formats
  let parsed = parse(str, 'yyyy-MM-dd', new Date())
  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')

  parsed = parse(str, 'dd/MM/yyyy', new Date())
  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')

  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10)
  return null
}

export function normalizeInstallment(value: any): string {
  if (!value) return ''
  const str = String(value).trim()
  if (/^\d+\/\d+$/.test(str)) return str
  if (/^\d+$/.test(str)) return str

  const ptMonths = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ]
  const enMonths = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ]

  const lower = str.toLowerCase()
  let monthIndex = -1

  for (let i = 0; i < 12; i++) {
    if (lower.includes(ptMonths[i]) || lower.includes(enMonths[i])) {
      monthIndex = i + 1
      break
    }
  }

  if (monthIndex > 0) {
    const match = lower.match(/(\d+)/)
    if (match) {
      const numerator = parseInt(match[1], 10)
      return `${numerator}/${monthIndex}`
    }
  }

  return str
}

export function normalizeReceivableStatus(status: string): string {
  const s = normalizeText(status).toLowerCase()
  if (
    s.includes('pago') ||
    s.includes('baixad') ||
    s.includes('recebid') ||
    s.includes('liquidado')
  )
    return 'Liquidado'
  if (s.includes('estorn') || s.includes('anulad') || s.includes('cancelad'))
    return 'Cancelado'
  return 'Aberto'
}

export function normalizePayableStatus(
  status: string,
  dueDate: string | null,
): string {
  const s = normalizeText(status).toLowerCase()
  if (
    s.includes('pago') ||
    s.includes('baixad') ||
    s.includes('liquidado') ||
    s.includes('paid')
  )
    return 'paid'
  if (
    s.includes('cancelad') ||
    s.includes('anulad') ||
    s.includes('estorn') ||
    s.includes('cancelled')
  )
    return 'cancelled'

  if (dueDate) {
    const due = new Date(dueDate + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // If due date is strictly before today (midnight)
    if (due < today) return 'overdue'
  }

  return 'pending'
}

// --- Fetching Helpers ---

export async function fetchAllRecords(
  supabaseClient: any,
  table: string,
  companyIds: string[],
  extraFilter?: (query: any) => any,
) {
  let allData: any[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true
  const MAX_PAGES = 100

  while (hasMore && page < MAX_PAGES) {
    let query = supabaseClient.from(table).select('*')

    if (companyIds.length > 0) {
      query = query.in('company_id', companyIds)
    }

    if (extraFilter) {
      query = extraFilter(query)
    }

    const { data, error } = await query.range(
      page * pageSize,
      (page + 1) * pageSize - 1,
    )

    if (error) throw error

    if (data) {
      if (data.length === 0) {
        hasMore = false
      } else {
        allData = [...allData, ...data]
        if (data.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      }
    } else {
      hasMore = false
    }
  }

  return allData
}

export async function getVisibleCompanyIds(
  supabaseClient: any,
  userId: string,
  selectedCompanyId: string | null,
): Promise<string[]> {
  if (selectedCompanyId && selectedCompanyId !== 'all') {
    return [selectedCompanyId]
  }

  const { data, error } = await supabaseClient
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching visible companies:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  return data.map((item: any) => item.company_id)
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

  if (error) {
    console.error('Error resolving company via RPC:', error)
    throw new Error(`Falha ao resolver empresa: ${error.message}`)
  }

  if (!data) {
    throw new Error('Falha crítica: ID da empresa não retornado.')
  }

  return data as string
}

export const resolveCompanyIdFromName = ensureCompanyAndLink
export const ensureEmpresaAndLink = ensureCompanyAndLink

// --- Bank Balances Helpers ---

export async function getBankBalance(
  companyId: string,
  bankId: string,
  date: string,
) {
  const { data, error } = await supabase
    .from('bank_balances_v2')
    .select('amount, id')
    .eq('company_id', companyId)
    .eq('bank_id', bankId)
    .eq('reference_date', date)
    .maybeSingle()

  if (error) {
    console.error('Error fetching bank balance:', error)
    return 0
  }

  return data?.amount || 0
}

export async function upsertBankBalance(payload: {
  company_id: string
  bank_id: string
  reference_date: string
  amount: number
}) {
  // Service-level validation
  if (payload.amount < 0) {
    throw new Error('O saldo não pode ser negativo.')
  }

  if (!payload.company_id || !payload.bank_id || !payload.reference_date) {
    throw new Error('Campos obrigatórios faltando (Empresa, Banco ou Data).')
  }

  const { data, error } = await supabase
    .from('bank_balances_v2')
    .upsert(
      {
        company_id: payload.company_id,
        bank_id: payload.bank_id,
        reference_date: payload.reference_date,
        amount: payload.amount,
      },
      {
        onConflict: 'company_id,bank_id,reference_date',
      },
    )
    .select()
    .single()

  if (error) {
    if (error.code === '23514') {
      // Check constraint violation code
      throw new Error(`Erro: O saldo não pode ser negativo.`)
    }
    throw new Error(`Erro ao salvar saldo: ${error.message}`)
  }
  return data
}

export async function deleteBankBalance(id: string) {
  const { error } = await supabase
    .from('bank_balances_v2')
    .delete()
    .eq('id', id)
  if (error) {
    throw new Error(`Erro ao excluir saldo: ${error.message}`)
  }
}

// --- Manual Saving ---

export async function salvarReceivableManual(payload: any, userId: string) {
  const companyInput =
    payload.company_id || payload.company || payload.id_da_empresa
  if (!companyInput) {
    throw new Error('Selecione/Informe a empresa')
  }

  const companyId = await ensureCompanyAndLink(userId, companyInput)

  const rawTitleStatus = normalizeText(
    payload.status_do_titulo || payload.title_status || 'Aberto',
  )
  const titleStatus = normalizeReceivableStatus(rawTitleStatus)

  const dbPayload = {
    company_id: companyId,
    invoice_number: normalizeText(
      payload.numero_da_fatura || payload.invoice_number,
    ),
    order_number: normalizeText(
      payload.numero_do_pedido || payload.order_number,
    ),
    customer: normalizeText(payload.cliente || payload.customer),
    customer_doc: normalizeText(payload.documento || payload.customer_doc),
    issue_date: d(payload.data_de_emissao || payload.issue_date),
    due_date: d(payload.data_de_vencimento || payload.due_date),
    payment_prediction: d(
      payload.previsao_de_pagamento || payload.payment_prediction,
    ),
    principal_value: n(payload.valor_principal || payload.principal_value),
    fine: n(payload.multa || payload.fine),
    interest: n(payload.juros || payload.interest),
    updated_value: n(payload.valor_atualizado || payload.updated_value),
    title_status: titleStatus,
    seller: normalizeText(
      payload.vendedor || payload.seller || payload.salesperson,
    ),
    customer_code: normalizeText(payload.customer_code || payload.code),
    uf: normalizeText(payload.uf || payload.state),
    regional: normalizeText(payload.regional),
    installment: normalizeInstallment(payload.installment),
    days_overdue: n(payload.days_overdue || payload.dias),
    utilization: normalizeText(payload.utilization),
    negativado: normalizeText(payload.negativado || payload.is_negative),
    description: normalizeText(payload.description),
    customer_name: normalizeText(
      payload.customer_name || payload.nome_cliente || payload.customer,
    ),
    new_status: normalizeText(payload.new_status || payload.novo_status),
  }

  if (payload.id) {
    const { data, error } = await supabase
      .from('receivables')
      .update(dbPayload)
      .eq('id', payload.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('receivables')
      .upsert(dbPayload, {
        onConflict: 'company_id,invoice_number,order_number,installment',
      })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function salvarPayableManual(payload: any, userId: string) {
  const companyInput = payload.company_id || payload.company
  if (!companyInput) {
    throw new Error('Selecione/Informe a empresa')
  }

  const companyId = await ensureCompanyAndLink(userId, companyInput)

  const dueDate = d(payload.due_date || payload.vencimento)
  const status = normalizePayableStatus(payload.status || 'pending', dueDate)

  const dbPayload = {
    company_id: companyId,
    entity_name: normalizeText(
      payload.entity_name || payload.fornecedor || payload.supplier,
    ),
    document_number: normalizeText(
      payload.document_number || payload.documento,
    ),
    issue_date: d(payload.issue_date || payload.emissao),
    due_date: dueDate,
    principal_value: n(payload.principal_value || payload.valor_principal),
    fine: n(payload.fine || payload.multa),
    interest: n(payload.interest || payload.juros),
    amount: n(payload.amount || payload.valor_total || payload.valor),
    status: status,
    type: 'payable',
    category: normalizeText(payload.category || payload.categoria),
    description: normalizeText(payload.description || payload.descricao),
  }

  if (payload.id) {
    const { data, error } = await supabase
      .from('transactions')
      .update(dbPayload)
      .eq('id', payload.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('transactions')
      .insert(dbPayload)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function salvarBankManual(payload: any, userId: string) {
  const companyInput =
    payload.company_id || payload.company || payload.company_name

  if (!companyInput) {
    throw new Error('Selecione/Informe a empresa (Obrigatório)')
  }

  const companyId = await ensureCompanyAndLink(userId, companyInput)

  const dbPayload = {
    company_id: companyId,
    name: normalizeText(payload.name),
    code: normalizeText(payload.code),
    institution: normalizeText(payload.institution),
    agency: normalizeText(payload.agency),
    account_number: normalizeText(payload.account_number),
    account_digit: normalizeText(payload.account_digit),
    type: normalizeText(payload.type || 'bank'),
    active: payload.active !== undefined ? payload.active : true,
  }

  const id =
    payload.id && !String(payload.id).startsWith('temp-')
      ? payload.id
      : undefined

  if (id) {
    const { data, error } = await supabase
      .from('banks')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      if (error.code === '23505') {
        throw new Error(
          'Já existe uma conta com este código para esta empresa.',
        )
      }
      throw error
    }
    return data
  } else {
    const { data, error } = await supabase
      .from('banks')
      .insert(dbPayload)
      .select()
      .single()
    if (error) {
      if (error.code === '23505') {
        throw new Error(
          'Já existe uma conta com este código para esta empresa.',
        )
      }
      throw error
    }
    return data
  }
}

export async function salvarImportLogManual(payload: any, userId: string) {
  const companyInput = payload.company_id
  if (!companyInput) {
    throw new Error('Selecione/Informe a empresa')
  }

  const companyId = await ensureCompanyAndLink(userId, companyInput)

  const dbPayload = {
    company_id: companyId,
    user_id: userId,
    filename: normalizeText(payload.filename),
    status: normalizeText(payload.status),
    total_records: n(payload.total_records),
    success_count: n(payload.success_count),
    error_count: n(payload.error_count),
    deleted_count: n(payload.deleted_count),
    error_details: payload.error_details || null,
  }

  if (payload.id) {
    const { data, error } = await supabase
      .from('import_logs')
      .update(dbPayload)
      .eq('id', payload.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('import_logs')
      .insert(dbPayload)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function importarReceivables(
  rows: any[],
  userId: string,
  fallbackCompanyId: string | null,
  onProgress?: (percent: number) => void,
) {
  const results = {
    total: rows.length,
    success: 0,
    deleted: 0,
    errors: [] as string[],
    lastCompanyId: '' as string,
  }

  if (rows.length === 0) {
    return { ...results, message: 'Arquivo vazio.' }
  }

  const companiesMap = new Map<string, any[]>()
  const companyIdCache = new Map<string, string>()

  if (fallbackCompanyId) {
    companyIdCache.set('__fallback__', fallbackCompanyId)
  }

  const uniqueKeys = new Set<string>()
  let processedCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      let companyId = fallbackCompanyId
      const companyNameInRow = normalizeText(
        row['Empresa'] || row['company'] || row['id_da_empresa'],
      )

      if (companyNameInRow) {
        if (companyIdCache.has(companyNameInRow)) {
          companyId = companyIdCache.get(companyNameInRow)!
        } else {
          companyId = await ensureCompanyAndLink(userId, companyNameInRow)
          companyIdCache.set(companyNameInRow, companyId)
        }
      }

      if (!companyId) {
        throw new Error(
          'Empresa não identificada. Selecione uma empresa ou inclua a coluna "Empresa".',
        )
      }

      results.lastCompanyId = companyId

      // Normalize status using the new function
      const rawStatus = normalizeText(
        row['Status do Título'] ||
          row['title_status'] ||
          row['status_do_titulo'] ||
          'Aberto',
      )
      const titleStatus = normalizeReceivableStatus(rawStatus)

      const dbItem = {
        invoice_number: normalizeText(
          row['NF'] || row['invoice_number'] || row['numero_da_fatura'],
        ),
        order_number: normalizeText(
          row['Nr do Pedido'] || row['order_number'] || row['numero_do_pedido'],
        ),
        customer: normalizeText(
          row['Cliente'] ||
            row['customer'] ||
            row['cliente'] ||
            'Consumidor Final',
        ),
        customer_doc: normalizeText(
          row['CNPJ/CPF'] || row['customer_doc'] || row['documento'],
        ),
        issue_date:
          d(
            row['Data de Emissão'] ||
              row['issue_date'] ||
              row['data_de_emissao'],
          ) || new Date().toISOString(),
        due_date: d(
          row['Dt. Vencimento'] || row['due_date'] || row['data_de_vencimento'],
        ),
        payment_prediction: d(
          row['Previsão de Pgto.'] ||
            row['payment_prediction'] ||
            row['previsao_de_pagamento'],
        ),
        principal_value: n(
          row['Vlr Principal'] ||
            row['principal_value'] ||
            row['valor_principal'],
        ),
        fine: n(row['Multa'] || row['fine'] || row['multa']),
        interest: n(row['Juros'] || row['interest'] || row['juros']),
        updated_value: n(
          row['Vlr Atualizado'] ||
            row['updated_value'] ||
            row['valor_atualizado'] ||
            row['Vlr Principal'],
        ),
        title_status: titleStatus,
        seller: normalizeText(
          row['Vendedor'] || row['seller'] || row['vendedor'],
        ),
        customer_code: normalizeText(row['Código'] || row['customer_code']),
        uf: normalizeText(row['UF'] || row['uf']),
        regional: normalizeText(row['Regional'] || row['regional']),
        installment: normalizeInstallment(row['Parcela'] || row['installment']),
        days_overdue: n(row['Dias'] || row['days_overdue']),
        utilization: normalizeText(row['Utilização'] || row['utilization']),
        negativado: normalizeText(row['Negativado'] || row['negativado']),
        description: normalizeText(row['Descrição'] || row['description']),
        customer_name: normalizeText(
          row['customer_name'] ||
            row['nome_cliente'] ||
            row['Cliente'] ||
            row['customer'],
        ),
        new_status: normalizeText(row['new_status'] || row['novo_status']),
      }

      if (!dbItem.due_date) {
        throw new Error('Data de vencimento inválida.')
      }

      const key = `${companyId}|${dbItem.invoice_number}|${dbItem.order_number}|${dbItem.installment}`
      if (uniqueKeys.has(key)) {
        continue
      }
      uniqueKeys.add(key)

      if (!companiesMap.has(companyId)) {
        companiesMap.set(companyId, [])
      }
      companiesMap.get(companyId)!.push(dbItem)
    } catch (err: any) {
      results.errors.push(`Linha ${i + 2}: ${err.message}`)
    }

    processedCount++
    if (onProgress && processedCount % 50 === 0) {
      const percent = Math.round((processedCount / rows.length) * 50)
      onProgress(percent)
    }
  }

  let companiesProcessed = 0
  const totalCompanies = companiesMap.size

  for (const [companyId, companyRows] of companiesMap.entries()) {
    try {
      const { data, error } = await supabase.rpc('strict_replace_receivables', {
        p_company_id: companyId,
        p_rows: companyRows,
      })

      if (error) throw error

      if (data && data.success) {
        results.success += data.stats.inserted
        results.deleted += data.stats.deleted
      } else {
        throw new Error(data?.error || 'Erro desconhecido ao substituir dados.')
      }
    } catch (err: any) {
      results.errors.push(
        `Erro crítico ao salvar dados da empresa ${companyId}: ${err.message}`,
      )
    }

    companiesProcessed++
    if (onProgress) {
      const percent =
        50 + Math.round((companiesProcessed / totalCompanies) * 50)
      onProgress(percent)
    }
  }

  return results
}

export async function importarPayables(
  rows: any[],
  userId: string,
  fallbackCompanyId: string | null,
  onProgress?: (percent: number) => void,
) {
  const results = {
    total: rows.length,
    success: 0,
    deleted: 0,
    errors: [] as string[],
    lastCompanyId: '' as string,
  }

  if (rows.length === 0) {
    return { ...results, message: 'Arquivo vazio.' }
  }

  const companiesMap = new Map<string, any[]>()
  const companyIdCache = new Map<string, string>()
  const uniqueKeys = new Set<string>()

  if (fallbackCompanyId) {
    companyIdCache.set('__fallback__', fallbackCompanyId)
  }

  let processedCount = 0

  // 1. Process rows and group by company
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      let companyId = fallbackCompanyId
      const companyNameInRow = normalizeText(
        row['Empresa'] || row['company'] || row['id_da_empresa'],
      )

      if (companyNameInRow) {
        if (companyIdCache.has(companyNameInRow)) {
          companyId = companyIdCache.get(companyNameInRow)!
        } else {
          companyId = await ensureCompanyAndLink(userId, companyNameInRow)
          companyIdCache.set(companyNameInRow, companyId)
        }
      }

      if (!companyId) {
        throw new Error(
          'Empresa não identificada. Selecione uma empresa ou inclua a coluna "Empresa".',
        )
      }

      results.lastCompanyId = companyId

      // Field Extraction & Normalization
      const entityName = normalizeText(
        row['Fornecedor'] || row['entity_name'] || row['supplier'],
      )
      if (!entityName) throw new Error('Fornecedor é obrigatório.')

      const documentNumber = normalizeText(
        row['Documento'] || row['document_number'] || row['nf'],
      )
      const issueDate =
        d(row['Emissao'] || row['issue_date'] || row['data_emissao']) ||
        new Date().toISOString()
      const dueDate = d(
        row['Vencimento'] || row['due_date'] || row['data_vencimento'],
      )

      if (!dueDate) throw new Error('Data de vencimento inválida.')

      let principal = n(
        row['Valor Principal'] || row['principal_value'] || row['Valor'],
      )
      const fine = n(row['Multa'] || row['fine'])
      const interest = n(row['Juros'] || row['interest'])

      // Calculate amount if not explicitly provided or sum up
      let amount = n(row['Total'] || row['amount'] || row['valor_total'])
      if (amount === 0 && principal > 0) {
        amount = principal + fine + interest
      }
      if (amount === 0 && principal === 0) {
        // Try to find any value column
        amount = n(row['Valor'] || row['valor'])
        if (amount > 0 && principal === 0) principal = amount
      }

      const statusRaw = normalizeText(
        row['Status'] || row['status'] || 'pending',
      )
      const status = normalizePayableStatus(statusRaw, dueDate)

      const category = normalizeText(
        row['Categoria'] || row['category'] || 'Geral',
      )
      const description = normalizeText(
        row['Descrição'] || row['description'] || 'Importado via Planilha',
      )

      // Deduplication Key
      const key = `${companyId}|${entityName}|${documentNumber}|${dueDate}|${amount.toFixed(2)}`
      if (uniqueKeys.has(key)) {
        continue // Skip duplicate row
      }
      uniqueKeys.add(key)

      const dbItem = {
        entity_name: entityName,
        document_number: documentNumber,
        issue_date: issueDate,
        due_date: dueDate,
        principal_value: principal,
        fine: fine,
        interest: interest,
        amount: amount,
        status: status,
        category: category,
        description: description,
      }

      if (!companiesMap.has(companyId)) {
        companiesMap.set(companyId, [])
      }
      companiesMap.get(companyId)!.push(dbItem)
    } catch (err: any) {
      results.errors.push(`Linha ${i + 2}: ${err.message}`)
    }

    processedCount++
    if (onProgress && processedCount % 50 === 0) {
      const percent = Math.round((processedCount / rows.length) * 50)
      onProgress(percent)
    }
  }

  // 2. Bulk Replace per Company
  let companiesProcessed = 0
  const totalCompanies = companiesMap.size

  for (const [companyId, companyRows] of companiesMap.entries()) {
    try {
      const { data, error } = await supabase.rpc('strict_replace_payables', {
        p_company_id: companyId,
        p_rows: companyRows,
      })

      if (error) throw error

      if (data && data.success) {
        results.success += data.inserted
        results.deleted += data.deleted
      } else {
        throw new Error(data?.error || 'Erro desconhecido ao substituir dados.')
      }
    } catch (err: any) {
      results.errors.push(
        `Erro crítico ao salvar dados da empresa ${companyId}: ${err.message}`,
      )
    }

    companiesProcessed++
    if (onProgress) {
      const percent =
        50 + Math.round((companiesProcessed / totalCompanies) * 50)
      onProgress(percent)
    }
  }

  return results
}
