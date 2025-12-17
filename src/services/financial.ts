import { supabase } from '@/lib/supabase/client'
import { parse, isValid, format } from 'date-fns'

// --- Normalization Helpers ---

export function s(text: any): string {
  if (text === null || text === undefined) return ''
  return String(text).trim()
}

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
  const val = s(companyIdOrName)
  if (!val) throw new Error('ID ou Nome da empresa é obrigatório')

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  let finalCompanyId = ''

  if (isUuid) {
    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('id', val)
      .maybeSingle()

    if (data) {
      finalCompanyId = data.id
    } else {
      // If UUID provided but not found, check if it was treated as name or error
      throw new Error(`Empresa com ID ${val} não encontrada.`)
    }
  } else {
    // It's a name, lookup or create
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .ilike('name', val)
      .maybeSingle()

    if (existing) {
      finalCompanyId = existing.id
    } else {
      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({ name: val, origin: 'Import/Manual' })
        .select('id')
        .single()

      if (error) {
        if (error.code === '23505') {
          // Race condition fallback
          const { data: retry } = await supabase
            .from('companies')
            .select('id')
            .ilike('name', val)
            .maybeSingle()
          if (retry) finalCompanyId = retry.id
          else
            throw new Error(`Falha ao criar empresa ${val}: ${error.message}`)
        } else {
          throw new Error(`Falha ao criar empresa ${val}: ${error.message}`)
        }
      } else {
        finalCompanyId = newCompany.id
      }
    }
  }

  // Ensure link exists
  const { data: link } = await supabase
    .from('user_companies')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', finalCompanyId)
    .maybeSingle()

  if (!link) {
    await supabase
      .from('user_companies')
      .insert({ user_id: userId, company_id: finalCompanyId })
  }

  return finalCompanyId
}

export const getOrCreateEmpresaId = async (name: string) => {
  // This logic is now inside ensureCompanyAndLink
  return name
}
export const ensureEmpresaAndLink = ensureCompanyAndLink

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
    invoice_number: s(payload.numero_da_fatura || payload.invoice_number),
    order_number: s(payload.numero_do_pedido || payload.order_number),
    customer: s(payload.cliente || payload.customer),
    customer_doc: s(payload.documento || payload.customer_doc),
    issue_date: d(payload.data_de_emissao || payload.issue_date),
    due_date: d(payload.data_de_vencimento || payload.due_date),
    payment_prediction: d(
      payload.previsao_de_pagamento || payload.payment_prediction,
    ),
    principal_value: n(payload.valor_principal || payload.principal_value),
    fine: n(payload.multa || payload.fine),
    interest: n(payload.juros || payload.interest),
    updated_value: n(payload.valor_atualizado || payload.updated_value),
    title_status: s(
      payload.status_do_titulo || payload.title_status || 'Aberto',
    ),
    seller: s(payload.vendedor || payload.seller || payload.salesperson),
    customer_code: s(payload.customer_code || payload.code),
    uf: s(payload.uf || payload.state),
    regional: s(payload.regional),
    installment: s(payload.installment),
    days_overdue: n(payload.days_overdue || payload.dias),
    utilization: s(payload.utilization),
    negativado: s(payload.negativado || payload.is_negative),
    description: s(payload.description),
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
      .insert(dbPayload)
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
    entity_name: s(
      payload.entity_name || payload.fornecedor || payload.supplier,
    ),
    document_number: s(payload.document_number || payload.documento),
    issue_date: d(payload.issue_date || payload.emissao),
    due_date: d(payload.due_date || payload.vencimento),
    principal_value: n(payload.principal_value || payload.valor_principal),
    fine: n(payload.fine || payload.multa),
    interest: n(payload.interest || payload.juros),
    amount: n(payload.amount || payload.valor_total || payload.valor),
    status: s(payload.status || 'pending'),
    type: 'payable',
    category: s(payload.category || payload.categoria),
    description: s(payload.description || payload.descricao),
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

  if (!companyId) {
    throw new Error('Falha crítica ao resolver ID da empresa.')
  }

  const dbPayload = {
    company_id: companyId,
    name: s(payload.name),
    code: s(payload.code),
    institution: s(payload.institution),
    agency: s(payload.agency),
    account_number: s(payload.account_number),
    account_digit: s(payload.account_digit),
    type: s(payload.type || 'bank'),
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

// --- Import Logic with Batching ---

export async function importarReceivables(
  rows: any[],
  userId: string,
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

  // Pre-process Rows (Forward Fill Company)
  let lastCompanyName = ''
  const preProcessedRows = rows.map((row, index) => {
    let companyName = s(
      row['Empresa'] || row['company'] || row['id_da_empresa'],
    )
    if (!companyName && lastCompanyName) {
      companyName = lastCompanyName
    }
    if (companyName) {
      lastCompanyName = companyName
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
      const rowIndex = row.__originalIndex // Defined outside try/catch to be accessible
      try {
        const companyName = row.__companyNameResolved

        if (!companyName) {
          throw new Error('Empresa não identificada (Linha sem empresa).')
        }

        let companyId = companyCache.get(companyName)
        if (!companyId) {
          companyId = await ensureCompanyAndLink(userId, companyName)
          companyCache.set(companyName, companyId)
        }

        results.lastCompanyId = companyId

        const dbItem = {
          company_id: companyId,
          invoice_number: s(
            row['NF'] || row['invoice_number'] || row['numero_da_fatura'],
          ),
          order_number: s(
            row['Nr do Pedido'] ||
              row['order_number'] ||
              row['numero_do_pedido'],
          ),
          customer: s(
            row['Cliente'] ||
              row['customer'] ||
              row['cliente'] ||
              'Consumidor Final',
          ),
          customer_doc: s(
            row['CNPJ/CPF'] || row['customer_doc'] || row['documento'],
          ),
          issue_date:
            d(
              row['Data de Emissão'] ||
                row['issue_date'] ||
                row['data_de_emissao'],
            ) || new Date().toISOString(),
          due_date: d(
            row['Dt. Vencimento'] ||
              row['due_date'] ||
              row['data_de_vencimento'],
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
          title_status: s(
            row['Status do Título'] ||
              row['title_status'] ||
              row['status_do_titulo'] ||
              'Aberto',
          ),
          seller: s(row['Vendedor'] || row['seller'] || row['vendedor']),
          customer_code: s(row['Código'] || row['customer_code']),
          uf: s(row['UF'] || row['uf']),
          regional: s(row['Regional'] || row['regional']),
          installment: s(row['Parcela'] || row['installment']),
          days_overdue: n(row['Dias'] || row['days_overdue']),
          utilization: s(row['Utilização'] || row['utilization']),
          negativado: s(row['Negativado'] || row['negativado']),
          description: 'Importado via Planilha',
        }

        if (!dbItem.due_date) {
          throw new Error('Data de vencimento inválida.')
        }

        await supabase.from('receivables').insert(dbItem)
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

export async function importarPayables(
  rows: any[],
  userId: string,
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

  // Pre-process Rows (Forward Fill Company)
  let lastCompanyName = ''
  const preProcessedRows = rows.map((row, index) => {
    let companyName = s(row['Empresa'] || row['company'])
    if (!companyName && lastCompanyName) {
      companyName = lastCompanyName
    }
    if (companyName) {
      lastCompanyName = companyName
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
      const rowIndex = row.__originalIndex // Defined outside try/catch
      try {
        const companyName = row.__companyNameResolved

        if (!companyName) {
          throw new Error('Empresa não identificada.')
        }

        let companyId = companyCache.get(companyName)
        if (!companyId) {
          companyId = await ensureCompanyAndLink(userId, companyName)
          companyCache.set(companyName, companyId)
        }

        results.lastCompanyId = companyId

        const payload = {
          company_id: companyId,
          entity_name: s(
            row['Fornecedor'] || row['entity_name'] || row['supplier'],
          ),
          document_number: s(row['Documento'] || row['document_number']),
          issue_date:
            d(row['Emissao'] || row['issue_date']) || new Date().toISOString(),
          due_date: d(row['Vencimento'] || row['due_date']),
          principal_value: n(
            row['Valor'] || row['amount'] || row['principal_value'],
          ),
          fine: n(row['Multa'] || row['fine']),
          interest: n(row['Juros'] || row['interest']),
          amount: n(row['Total'] || row['amount'] || row['Valor']),
          status: s(row['Status'] || 'pending'),
          category: s(row['Categoria'] || row['category']),
          description: s(row['Descrição'] || 'Importado via Planilha'),
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
