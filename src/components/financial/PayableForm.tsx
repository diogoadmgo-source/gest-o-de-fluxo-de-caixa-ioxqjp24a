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
import { Transaction } from '@/lib/types'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'

interface PayableFormProps {
  initialData?: Transaction
  onSave: (data: Transaction) => void
  onCancel: () => void
}

export function PayableForm({
  initialData,
  onSave,
  onCancel,
}: PayableFormProps) {
  const { companies, selectedCompanyId } = useCashFlowStore()

  const [formData, setFormData] = useState<Partial<Transaction>>({
    company_id: selectedCompanyId || undefined,
    entity_name: '',
    document_number: '',
    principal_value: 0,
    fine: 0,
    interest: 0,
    amount: 0,
    status: 'pending',
    type: 'payable',
    due_date: new Date().toISOString().split('T')[0],
    issue_date: new Date().toISOString().split('T')[0],
    category: 'Geral',
    ...initialData,
  })

  useEffect(() => {
    const principal = Number(formData.principal_value) || 0
    const fine = Number(formData.fine) || 0
    const interest = Number(formData.interest) || 0
    const total = principal + fine + interest

    if (total !== formData.amount) {
      setFormData((prev) => ({ ...prev, amount: total }))
    }
  }, [formData.principal_value, formData.fine, formData.interest])

  const handleChange = (field: keyof Transaction, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Front-end Validation as per Acceptance Criteria
    if (!formData.company_id) {
      toast.error('Selecione/Informe a empresa')
      return
    }

    if (formData.entity_name && formData.principal_value !== undefined) {
      onSave(formData as Transaction)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Select
            value={formData.company_id || 'none'}
            onValueChange={(val) =>
              handleChange('company_id', val === 'none' ? undefined : val)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
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
          <Label htmlFor="doc">Documento</Label>
          <Input
            id="doc"
            value={formData.document_number}
            onChange={(e) => handleChange('document_number', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier">Fornecedor</Label>
        <Input
          id="supplier"
          value={formData.entity_name}
          onChange={(e) => handleChange('entity_name', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(val) => handleChange('status', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
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
        <Label htmlFor="total">Valor Total (Calculado)</Label>
        <Input
          id="total"
          value={formData.amount?.toLocaleString('pt-BR', {
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
