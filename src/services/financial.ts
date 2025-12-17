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
  // BR format: 1.234,56 -> 1234.56
  // Remove dots (thousand separators) and replace comma with dot (decimal)
  const cleanStr = str.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleanStr)
  return isNaN(num) ? 0 : num
}

export function d(value: any): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().split('T')[0]

  // Handle Excel serial date (numbers like 45000)
  if (typeof value === 'number') {
    // Excel base date usually Dec 30 1899
    const excelDate = new Date((value - 25569) * 86400 * 1000)
    if (isValid(excelDate)) return excelDate.toISOString().split('T')[0]
  }

  const str = String(value).trim()

  // Try ISO yyyy-MM-dd
  let parsed = parse(str, 'yyyy-MM-dd', new Date())
  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')

  // Try BR dd/MM/yyyy
  parsed = parse(str, 'dd/MM/yyyy', new Date())
  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')

  // Try simple ISO-like start
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    return str.substring(0, 10)
  }

  return null
}

// --- Company & User Linking Logic ---

export async function getOrCreateEmpresaId(name: string): Promise<string> {
  const normalizedName = s(name)
  if (!normalizedName) throw new Error('Company name is required')

  // 1. Check if exists
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .ilike('name', normalizedName)
    .maybeSingle()

  if (existing) {
    return existing.id
  }

  // 2. Create if not exists
  const { data: newCompany, error } = await supabase
    .from('companies')
    .insert({ name: normalizedName, origin: 'Import/Manual' })
    .select('id')
    .single()

  if (error) {
    // Handle race condition if created in parallel
    if (error.code === '23505') {
      // Unique violation
      const { data: retry } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', normalizedName)
        .maybeSingle()
      if (retry) return retry.id
    }
    throw new Error(
      `Failed to create company ${normalizedName}: ${error.message}`,
    )
  }

  return newCompany.id
}

export async function ensureUserCompanyLink(userId: string, companyId: string) {
  // Check if link exists
  const { data: link } = await supabase
    .from('user_companies')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!link) {
    const { error } = await supabase
      .from('user_companies')
      .insert({ user_id: userId, company_id: companyId })

    if (error && error.code !== '23505') {
      // Ignore duplicate key error
      console.error(`Failed to link user to company: ${error.message}`)
      // Not throwing here allows the process to continue, but ideally should ensure link
    }
  }
}

export async function ensureEmpresaAndLink(
  userId: string,
  companyIdOrName: string,
): Promise<string> {
  const val = s(companyIdOrName)
  if (!val) throw new Error('Company ID or Name is required')

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  let finalCompanyId = ''

  if (isUuid) {
    // Verify existence (optional but good for integrity)
    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('id', val)
      .maybeSingle()
    if (data) {
      finalCompanyId = data.id
    } else {
      // If looks like UUID but not found, maybe it's a very weird name? Unlikely.
      // Treat as name if not found? No, if it's UUID format, assume ID.
      // If not found, we can't create a company with that UUID easily (let DB gen).
      // Fallback: treat as name or error? Let's error if UUID provided but not found.
      throw new Error(`Company with ID ${val} not found.`)
    }
  } else {
    // It's a name
    finalCompanyId = await getOrCreateEmpresaId(val)
  }

  await ensureUserCompanyLink(userId, finalCompanyId)
  return finalCompanyId
}

// --- Manual Saving ---

export async function salvarReceivableManual(payload: any, userId: string) {
  const companyInput =
    payload.company_id || payload.company || payload.id_da_empresa
  if (!companyInput) {
    throw new Error('Selecione/Informe a empresa')
  }

  const companyId = await ensureEmpresaAndLink(userId, companyInput)

  // Map payload to DB columns (User Story Requirement)
  // We prioritize the explicit mapped keys, fallback to existing keys in payload
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
    // Extra fields to maintain full data integrity
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

  const companyId = await ensureEmpresaAndLink(userId, companyInput)

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

// --- Import Logic ---

let lastCompany: string = ''

function forwardFill(current: string): string {
  if (current) {
    lastCompany = current
    return current
  }
  return lastCompany
}

export async function importarReceivables(rows: any[], userId: string) {
  lastCompany = ''
  const results = {
    total: rows.length,
    success: 0,
    errors: [] as string[],
  }

  if (rows.length === 0) {
    return { ...results, message: 'Arquivo vazio.' }
  }

  const companyCache = new Map<string, string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      // 1. Resolve Company
      let companyName = s(
        row['Empresa'] || row['company'] || row['id_da_empresa'],
      )
      companyName = forwardFill(companyName)

      if (!companyName) {
        throw new Error(
          'Empresa não identificada (Linha sem empresa e sem anterior).',
        )
      }

      // Check cache first to avoid DB calls
      let companyId = companyCache.get(companyName)
      if (!companyId) {
        companyId = await ensureEmpresaAndLink(userId, companyName)
        companyCache.set(companyName, companyId)
      }

      // 2. Prepare Payload using keys that map correctly in salvarReceivableManual
      // We map row columns to the keys expected by salvarReceivableManual logic
      const payload = {
        company_id: companyId,
        numero_da_fatura:
          row['NF'] || row['invoice_number'] || row['numero_da_fatura'],
        numero_do_pedido:
          row['Nr do Pedido'] || row['order_number'] || row['numero_do_pedido'],
        cliente: row['Cliente'] || row['customer'] || row['cliente'],
        documento: row['CNPJ/CPF'] || row['customer_doc'] || row['documento'],
        data_de_emissao:
          row['Data de Emissão'] || row['issue_date'] || row['data_de_emissao'],
        data_de_vencimento:
          row['Dt. Vencimento'] || row['due_date'] || row['data_de_vencimento'],
        previsao_de_pagamento:
          row['Previsão de Pgto.'] ||
          row['payment_prediction'] ||
          row['previsao_de_pagamento'],
        valor_principal:
          row['Vlr Principal'] ||
          row['principal_value'] ||
          row['valor_principal'],
        multa: row['Multa'] || row['fine'] || row['multa'],
        juros: row['Juros'] || row['interest'] || row['juros'],
        valor_atualizado:
          row['Vlr Atualizado'] ||
          row['updated_value'] ||
          row['valor_atualizado'],
        status_do_titulo:
          row['Status do Título'] ||
          row['title_status'] ||
          row['status_do_titulo'],
        vendedor: row['Vendedor'] || row['seller'] || row['vendedor'],
        customer_code: row['Código'] || row['customer_code'],
        uf: row['UF'] || row['uf'],
        regional: row['Regional'] || row['regional'],
        installment: row['Parcela'] || row['installment'],
        days_overdue: row['Dias'] || row['days_overdue'],
        utilization: row['Utilização'] || row['utilization'],
        negativado: row['Negativado'] || row['negativado'],
        description: 'Importado via Planilha',
      }

      // 3. Save
      // We reuse salvarReceivableManual logic but we might want bulk insert for performance.
      // However, "using ensureEmpresaAndLink for each record" is satisfied.
      // To optimize, we can construct the object here and bulk insert at end,
      // OR call saving one by one. Bulk is safer for consistency but 'salvarReceivableManual' validation is good.
      // Let's build array and insert bulk for speed, but applying normalization.

      // We manually invoke the normalization logic here to build the DB object
      const dbItem = {
        company_id: companyId,
        invoice_number: s(payload.numero_da_fatura),
        order_number: s(payload.numero_do_pedido),
        customer: s(payload.cliente || 'Consumidor Final'),
        customer_doc: s(payload.documento),
        issue_date: d(payload.data_de_emissao) || new Date().toISOString(),
        due_date: d(payload.data_de_vencimento),
        payment_prediction: d(payload.previsao_de_pagamento),
        principal_value: n(payload.valor_principal),
        fine: n(payload.multa),
        interest: n(payload.juros),
        updated_value: n(payload.valor_atualizado || payload.valor_principal),
        title_status: s(payload.status_do_titulo),
        seller: s(payload.vendedor),
        customer_code: s(payload.customer_code),
        uf: s(payload.uf),
        regional: s(payload.regional),
        installment: s(payload.installment),
        days_overdue: n(payload.days_overdue),
        utilization: s(payload.utilization),
        negativado: s(payload.negativado),
        description: payload.description,
      }

      if (!dbItem.due_date) {
        throw new Error('Data de vencimento inválida.')
      }

      await supabase.from('receivables').insert(dbItem)
      results.success++
    } catch (err: any) {
      results.errors.push(`Linha ${i + 2}: ${err.message}`)
    }
  }

  return results
}

export async function importarPayables(rows: any[], userId: string) {
  lastCompany = ''
  const results = {
    total: rows.length,
    success: 0,
    errors: [] as string[],
  }

  if (rows.length === 0) {
    return { ...results, message: 'Arquivo vazio.' }
  }

  const companyCache = new Map<string, string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      // 1. Resolve Company
      let companyName = s(row['Empresa'] || row['company'])
      companyName = forwardFill(companyName)

      if (!companyName) {
        throw new Error('Empresa não identificada.')
      }

      let companyId = companyCache.get(companyName)
      if (!companyId) {
        companyId = await ensureEmpresaAndLink(userId, companyName)
        companyCache.set(companyName, companyId)
      }

      // 2. Map Payload
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
      results.errors.push(`Linha ${i + 2}: ${err.message}`)
    }
  }

  return results
}
