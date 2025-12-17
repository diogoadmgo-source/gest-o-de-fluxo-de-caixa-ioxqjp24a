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
  const str = String(value).trim()
  const cleanStr = str.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleanStr)
  return isNaN(num) ? 0 : num
}

export function d(value: any): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (typeof value === 'number') {
    const excelDate = new Date((value - 25569) * 86400 * 1000)
    if (isValid(excelDate)) return excelDate.toISOString().split('T')[0]
  }
  const str = String(value).trim()
  let parsed = parse(str, 'yyyy-MM-dd', new Date())
  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')
  parsed = parse(str, 'dd/MM/yyyy', new Date())
  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.substring(0, 10)
  return null
}

/**
 * Normalizes installment field to "current/total" format.
 * Handles Excel date conversion bugs (e.g. "01-Jan" -> "1/1").
 */
export function normalizeInstallment(value: any): string {
  if (!value) return ''
  const str = String(value).trim()

  // If it's already in N/NN format, keep it
  if (/^\d+\/\d+$/.test(str)) return str

  // If it's a simple number, keep it (e.g. "1")
  if (/^\d+$/.test(str)) return str

  // Handle Excel Date conversions (e.g., "01-Jan", "1-fev")
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

  // Detect month name
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

// --- Company Visibility Logic ---

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

// --- Company & User Linking Logic ---

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
    .from('bank_balances')
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
  const { data, error } = await supabase
    .from('bank_balances')
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
    throw new Error(`Erro ao salvar saldo: ${error.message}`)
  }
  return data
}

export async function deleteBankBalance(id: string) {
  const { error } = await supabase.from('bank_balances').delete().eq('id', id)
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
    title_status: normalizeText(
      payload.status_do_titulo || payload.title_status || 'Aberto',
    ),
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

  const dbPayload = {
    company_id: companyId,
    entity_name: normalizeText(
      payload.entity_name || payload.fornecedor || payload.supplier,
    ),
    document_number: normalizeText(
      payload.document_number || payload.documento,
    ),
    issue_date: d(payload.issue_date || payload.emissao),
    due_date: d(payload.due_date || payload.vencimento),
    principal_value: n(payload.principal_value || payload.valor_principal),
    fine: n(payload.fine || payload.multa),
    interest: n(payload.interest || payload.juros),
    amount: n(payload.amount || payload.valor_total || payload.valor),
    status: normalizeText(payload.status || 'pending'),
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

  if (payload.id && !String(payload.id).startsWith('temp-')) {
    const { data, error } = await supabase
      .from('banks')
      .update(dbPayload)
      .eq('id', payload.id)
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

// --- Import Logic with Overwrite Strategy ---

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

  // 1. Resolve Company and Prepare Data
  const companiesMap = new Map<string, any[]>()
  const companyIdCache = new Map<string, string>()

  // Pre-load fallback if available
  if (fallbackCompanyId) {
    // Assuming fallback is a valid UUID already resolved by caller
    // But we don't have the name easily here. We'll use the ID as key.
    companyIdCache.set('__fallback__', fallbackCompanyId)
  }

  // Set to track unique keys to avoid duplicates within the file sending to DB
  const uniqueKeys = new Set<string>()

  let processedCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      // Determine Company
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

      // Prepare DB Item
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
        title_status: normalizeText(
          row['Status do Título'] ||
            row['title_status'] ||
            row['status_do_titulo'] ||
            'Aberto',
        ),
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
        description: 'Importado via Planilha (Overwrite)',
      }

      if (!dbItem.due_date) {
        throw new Error('Data de vencimento inválida.')
      }

      // Deduplication check within the file
      const key = `${companyId}|${dbItem.invoice_number}|${dbItem.order_number}|${dbItem.installment}`
      if (uniqueKeys.has(key)) {
        // Skip duplicate in file
        continue
      }
      uniqueKeys.add(key)

      // Add to map
      if (!companiesMap.has(companyId)) {
        companiesMap.set(companyId, [])
      }
      companiesMap.get(companyId)!.push(dbItem)
    } catch (err: any) {
      results.errors.push(`Linha ${i + 2}: ${err.message}`)
    }

    processedCount++
    if (onProgress && processedCount % 50 === 0) {
      const percent = Math.round((processedCount / rows.length) * 50) // 0-50% for preparation
      onProgress(percent)
    }
  }

  // 2. Perform Atomic Overwrite per Company
  let companiesProcessed = 0
  const totalCompanies = companiesMap.size

  for (const [companyId, companyRows] of companiesMap.entries()) {
    try {
      const { data, error } = await supabase.rpc(
        'replace_receivables_for_company',
        {
          p_company_id: companyId,
          p_rows: companyRows,
        },
      )

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
        50 + Math.round((companiesProcessed / totalCompanies) * 50) // 50-100% for saving
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
    errors: [] as string[],
    lastCompanyId: '' as string,
  }

  if (rows.length === 0) {
    return { ...results, message: 'Arquivo vazio.' }
  }

  // Pre-process Rows
  let lastCompanyName = ''
  const preProcessedRows = rows.map((row, index) => {
    let companyName = ''
    if (!fallbackCompanyId) {
      companyName = normalizeText(row['Empresa'] || row['company'])
      if (!companyName && lastCompanyName) {
        companyName = lastCompanyName
      }
      if (companyName) {
        lastCompanyName = companyName
      }
    }
    return {
      ...row,
      __companyNameResolved: companyName,
      __originalIndex: index,
    }
  })

  const companyCache = new Map<string, string>()
  const BATCH_SIZE = 50

  for (let i = 0; i < preProcessedRows.length; i += BATCH_SIZE) {
    const batch = preProcessedRows.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async (row) => {
      const rowIndex = row.__originalIndex
      try {
        let companyId = fallbackCompanyId

        if (!companyId) {
          const companyName = row.__companyNameResolved
          if (!companyName) {
            throw new Error('Empresa não identificada.')
          }
          companyId = companyCache.get(companyName)
          if (!companyId) {
            companyId = await ensureCompanyAndLink(userId, companyName)
            companyCache.set(companyName, companyId)
          }
        }

        results.lastCompanyId = companyId!

        const payload = {
          company_id: companyId,
          entity_name: normalizeText(
            row['Fornecedor'] || row['entity_name'] || row['supplier'],
          ),
          document_number: normalizeText(
            row['Documento'] || row['document_number'],
          ),
          issue_date:
            d(row['Emissao'] || row['issue_date']) || new Date().toISOString(),
          due_date: d(row['Vencimento'] || row['due_date']),
          principal_value: n(
            row['Valor'] || row['amount'] || row['principal_value'],
          ),
          fine: n(row['Multa'] || row['fine']),
          interest: n(row['Juros'] || row['interest']),
          amount: n(row['Total'] || row['amount'] || row['Valor']),
          status: normalizeText(row['Status'] || 'pending'),
          category: normalizeText(row['Categoria'] || row['category']),
          description: normalizeText(
            row['Descrição'] || 'Importado via Planilha',
          ),
          type: 'payable',
        }

        if (!payload.due_date) throw new Error('Vencimento inválido')
        if (!payload.entity_name) throw new Error('Fornecedor obrigatório')

        await supabase.from('transactions').insert(payload)
        results.success++
      } catch (err: any) {
        results.errors.push(`Linha ${rowIndex + 2}: ${err.message}`)
      }
    })

    await Promise.all(promises)

    if (onProgress) {
      const processed = Math.min(i + BATCH_SIZE, rows.length)
      const percent = Math.round((processed / rows.length) * 100)
      onProgress(percent)
    }

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return results
}
