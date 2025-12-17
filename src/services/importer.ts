import { supabase } from '@/lib/supabase/client'
import { parse, isValid, format } from 'date-fns'

// --- Helpers ---

export function normalizeText(text: any): string {
  if (!text) return ''
  return String(text).trim()
}

export function normalizeEmail(email: any): string {
  if (!email) return ''
  return String(email).toLowerCase().trim()
}

export function asNumberBR(value: any): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  const str = String(value)
  // Remove dots (thousand separators) and replace comma with dot (decimal)
  // Example: 1.234,56 -> 1234.56
  const cleanStr = str.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleanStr)
  return isNaN(num) ? 0 : num
}

export function asISODate(value: any): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().split('T')[0]

  const str = String(value).trim()

  // Try dd/MM/yyyy
  const parsedBR = parse(str, 'dd/MM/yyyy', new Date())
  if (isValid(parsedBR)) return format(parsedBR, 'yyyy-MM-dd')

  // Try yyyy-MM-dd
  const parsedISO = parse(str, 'yyyy-MM-dd', new Date())
  if (isValid(parsedISO)) return format(parsedISO, 'yyyy-MM-dd')

  return null
}

export function mapStatus(status: string): string {
  const s = normalizeText(status).toLowerCase()
  if (s.includes('liquidado') || s.includes('pago') || s.includes('baixado'))
    return 'Liquidado'
  if (s.includes('cancelado')) return 'Cancelado'
  return 'Aberto'
}

export async function ensureCompanyByName(
  name: string,
  userId: string,
): Promise<string> {
  const normalizedName = normalizeText(name)
  if (!normalizedName) throw new Error('Company name is required')

  // 1. Check if exists
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('name', normalizedName)
    .maybeSingle()

  if (existing) {
    await ensureUserCompanyLink(userId, existing.id)
    return existing.id
  }

  // 2. Create if not exists
  const { data: newCompany, error } = await supabase
    .from('companies')
    .insert({ name: normalizedName, origin: 'Importação' })
    .select('id')
    .single()

  if (error)
    throw new Error(
      `Failed to create company ${normalizedName}: ${error.message}`,
    )

  await ensureUserCompanyLink(userId, newCompany.id)
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

    if (error && !error.message.includes('duplicate key')) {
      // Ignore duplicates if race condition occurred
      console.error(`Failed to link user to company: ${error.message}`)
    }
  }
}

// Helper to keep track of last company for forward fill
let lastCompany: string = ''

export function forwardFillEmpresa(currentCompany: string): string {
  if (currentCompany) {
    lastCompany = currentCompany
    return currentCompany
  }
  return lastCompany
}

export function resetForwardFill() {
  lastCompany = ''
}

export async function buildReceivablePayloadFromSheetRow(
  row: any,
  companyId: string,
) {
  const principal = asNumberBR(
    row['Vlr Principal'] || row['principal_value'] || row['valor'],
  )
  const updated = asNumberBR(
    row['Vlr Atualizado'] || row['updated_value'] || row['total'],
  )

  if (principal === 0 && updated === 0) {
    throw new Error('Linha sem valor válido.')
  }

  const dueDate = asISODate(row['Dt. Vencimento'] || row['due_date'])
  if (!dueDate) {
    throw new Error('Linha sem Dt. Vencimento válida.')
  }

  const issueDate =
    asISODate(row['Data de Emissão'] || row['issue_date']) ||
    new Date().toISOString()
  const paymentPrediction = asISODate(
    row['Previsão de Pgto.'] || row['payment_prediction'],
  )

  return {
    company_id: companyId,
    customer: normalizeText(
      row['Cliente'] || row['customer'] || 'Consumidor Final',
    ),
    customer_doc: normalizeText(row['CNPJ/CPF'] || row['customer_doc']),
    customer_code: normalizeText(row['Código'] || row['customer_code']),
    invoice_number: normalizeText(row['NF'] || row['invoice_number']),
    order_number: normalizeText(row['Nr do Pedido'] || row['order_number']),
    title_status: mapStatus(row['Status do Título'] || row['title_status']),
    issue_date: issueDate,
    due_date: dueDate,
    payment_prediction: paymentPrediction,
    principal_value: principal,
    fine: asNumberBR(row['Multa'] || row['fine']),
    interest: asNumberBR(row['Juros'] || row['interest']),
    updated_value: updated || principal,
    uf: normalizeText(row['UF'] || row['uf']),
    regional: normalizeText(row['Regional'] || row['regional']),
    seller: normalizeText(row['Vendedor'] || row['seller']),
    installment: normalizeText(row['Parcela'] || row['installment']),
    days_overdue: parseInt(row['Dias'] || row['days_overdue'] || '0'),
    utilization: normalizeText(row['Utilização'] || row['utilization']),
    negativado: normalizeText(row['Negativado'] || row['negativado']),
    description: `Importado via Planilha`,
  }
}

export async function importContasAReceberFromSheetRows(
  rows: any[],
  userId: string,
) {
  resetForwardFill()
  const results = {
    total: rows.length,
    success: 0,
    errors: [] as string[],
    data: [] as any[],
  }

  if (rows.length === 0) {
    return { ...results, message: 'Arquivo sem linhas para importar.' }
  }

  const payloads = []

  // Cache company IDs to avoid redundant DB calls
  const companyCache = new Map<string, string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      // 1. Company Handling
      let companyName = normalizeText(row['Empresa'] || row['company'])
      companyName = forwardFillEmpresa(companyName)

      if (!companyName) {
        throw new Error('Linha sem Empresa após preenchimento automático.')
      }

      let companyId = companyCache.get(companyName)
      if (!companyId) {
        companyId = await ensureCompanyByName(companyName, userId)
        companyCache.set(companyName, companyId)
      }

      // 2. Build Payload
      const payload = await buildReceivablePayloadFromSheetRow(row, companyId)
      payloads.push(payload)
      results.data.push(payload)
    } catch (err: any) {
      results.errors.push(`Linha ${i + 2}: ${err.message}`)
    }
  }

  // 3. Bulk Insert
  if (payloads.length > 0) {
    const { error } = await supabase.from('receivables').insert(payloads)
    if (error) {
      // If bulk insert fails, we might want to try one by one or just report failure
      // For now, fail the batch if DB constraint error
      results.errors.push(`Erro ao salvar no banco: ${error.message}`)
    } else {
      results.success = payloads.length
    }
  }

  return results
}
