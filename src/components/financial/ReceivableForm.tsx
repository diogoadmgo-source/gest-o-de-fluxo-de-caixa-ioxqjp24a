import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Receivable } from '@/lib/types'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'

interface ReceivableFormProps {
  initialData?: Receivable
  onSave: (data: Receivable) => void
  onCancel: () => void
}

export function ReceivableForm({
  initialData,
  onSave,
  onCancel,
}: ReceivableFormProps) {
  const { companies, selectedCompanyId } = useCashFlowStore()

  const [formData, setFormData] = useState<Partial<Receivable>>({
    company_id: selectedCompanyId || undefined,
    company: '',
    customer: '',
    customer_code: '',
    customer_doc: '',
    customer_name: '', // New field
    invoice_number: '',
    order_number: '',
    description: '',
    principal_value: 0,
    fine: 0,
    interest: 0,
    updated_value: 0,
    title_status: 'Aberto',
    new_status: '', // New field
    due_date: new Date().toISOString().split('T')[0],
    issue_date: new Date().toISOString().split('T')[0],
    payment_prediction: '',
    regional: '',
    seller: '',
    uf: '',
    installment: '',
    utilization: '',
    days_overdue: 0,
    negativado: 'Não',
    ...initialData,
  })

  // Auto-calculate updated value
  useEffect(() => {
    const principal = Number(formData.principal_value) || 0
    const fine = Number(formData.fine) || 0
    const interest = Number(formData.interest) || 0
    const total = principal + fine + interest

    if (total !== formData.updated_value) {
      setFormData((prev) => ({ ...prev, updated_value: total }))
    }
  }, [formData.principal_value, formData.fine, formData.interest])

  // Sync company name if company_id changes
  useEffect(() => {
    if (formData.company_id) {
      const comp = companies.find((c) => c.id === formData.company_id)
      if (comp && comp.name !== formData.company) {
        setFormData((prev) => ({ ...prev, company: comp.name }))
      }
    }
  }, [formData.company_id, companies])

  const handleChange = (field: keyof Receivable, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Front-end Validation as per Acceptance Criteria
    if (!formData.company_id || formData.company_id === 'none') {
      toast.error('Selecione/Informe a empresa')
      return
    }

    if (!formData.customer) {
      toast.error('O campo Cliente é obrigatório')
      return
    }

    if (formData.principal_value === undefined) {
      toast.error('O valor principal é obrigatório')
      return
    }

    onSave(formData as Receivable)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-[80vh] overflow-y-auto px-1"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">
            Empresa <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.company_id || 'none'}
            onValueChange={(val) =>
              handleChange('company_id', val === 'none' ? undefined : val)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione...</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title_status">Status</Label>
          <Select
            value={formData.title_status}
            onValueChange={(val) => handleChange('title_status', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Aberto">Aberto</SelectItem>
              <SelectItem value="Liquidado">Liquidado</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="customer">
            Cliente <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customer"
            value={formData.customer}
            onChange={(e) => handleChange('customer', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer_code">Cód. Cliente</Label>
          <Input
            id="customer_code"
            value={formData.customer_code}
            onChange={(e) => handleChange('customer_code', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer_name">Nome Cliente (Importação)</Label>
          <Input
            id="customer_name"
            value={formData.customer_name || ''}
            onChange={(e) => handleChange('customer_name', e.target.value)}
            placeholder="Nome oficial (se diferente)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new_status">Novo Status (Importação)</Label>
          <Input
            id="new_status"
            value={formData.new_status || ''}
            onChange={(e) => handleChange('new_status', e.target.value)}
            placeholder="Status adicional"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer_doc">CPF/CNPJ</Label>
          <Input
            id="customer_doc"
            value={formData.customer_doc}
            onChange={(e) => handleChange('customer_doc', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="uf">UF</Label>
          <Input
            id="uf"
            value={formData.uf}
            onChange={(e) => handleChange('uf', e.target.value)}
            maxLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="regional">Regional</Label>
          <Input
            id="regional"
            value={formData.regional}
            onChange={(e) => handleChange('regional', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoice">Nota Fiscal</Label>
          <Input
            id="invoice"
            value={formData.invoice_number}
            onChange={(e) => handleChange('invoice_number', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="order">Pedido</Label>
          <Input
            id="order"
            value={formData.order_number}
            onChange={(e) => handleChange('order_number', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="installment">Parcela</Label>
          <Input
            id="installment"
            value={formData.installment}
            onChange={(e) => handleChange('installment', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issue_date">Emissão</Label>
          <Input
            id="issue_date"
            type="date"
            value={formData.issue_date}
            onChange={(e) => handleChange('issue_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_date">Vencimento</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => handleChange('due_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment_prediction">Previsão Pagto.</Label>
          <Input
            id="payment_prediction"
            type="date"
            value={formData.payment_prediction || ''}
            onChange={(e) => handleChange('payment_prediction', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/10">
        <div className="space-y-2">
          <Label htmlFor="principal">Principal (R$)</Label>
          <Input
            id="principal"
            type="number"
            step="0.01"
            value={formData.principal_value}
            onChange={(e) =>
              handleChange('principal_value', parseFloat(e.target.value))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fine">Multa (R$)</Label>
          <Input
            id="fine"
            type="number"
            step="0.01"
            value={formData.fine}
            onChange={(e) => handleChange('fine', parseFloat(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="interest">Juros (R$)</Label>
          <Input
            id="interest"
            type="number"
            step="0.01"
            value={formData.interest}
            onChange={(e) =>
              handleChange('interest', parseFloat(e.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="total">Atualizado (R$)</Label>
          <Input
            id="total"
            value={formData.updated_value?.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
            disabled
            className="bg-muted font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="seller">Vendedor</Label>
          <Input
            id="seller"
            value={formData.seller}
            onChange={(e) => handleChange('seller', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="negativado">Negativado?</Label>
          <Select
            value={formData.negativado || 'Não'}
            onValueChange={(val) => handleChange('negativado', val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sim">Sim</SelectItem>
              <SelectItem value="Não">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="days_overdue">Dias em Atraso</Label>
          <Input
            id="days_overdue"
            type="number"
            value={formData.days_overdue}
            onChange={(e) =>
              handleChange('days_overdue', parseInt(e.target.value))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="utilization">Utilização</Label>
        <Input
          id="utilization"
          value={formData.utilization}
          onChange={(e) => handleChange('utilization', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição / Observações</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
