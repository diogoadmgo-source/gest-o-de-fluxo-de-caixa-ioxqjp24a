import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    invoice_number: '',
    principal_value: 0,
    fine: 0,
    interest: 0,
    updated_value: 0,
    title_status: 'Aberto',
    due_date: new Date().toISOString().split('T')[0],
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

    if (formData.customer && formData.principal_value !== undefined) {
      onSave(formData as Receivable)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          <Label htmlFor="invoice">Nota Fiscal</Label>
          <Input
            id="invoice"
            value={formData.invoice_number}
            onChange={(e) => handleChange('invoice_number', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer">Cliente</Label>
        <Input
          id="customer"
          value={formData.customer}
          onChange={(e) => handleChange('customer', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
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
        <div className="space-y-2">
          <Label htmlFor="dueDate">Vencimento</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.due_date}
            onChange={(e) => handleChange('due_date', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="total">Valor Atualizado (Calculado)</Label>
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

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
