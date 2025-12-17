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
import { ProductImport } from '@/lib/types'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'

interface ProductImportFormProps {
  initialData?: Partial<ProductImport>
  onSave: (data: Partial<ProductImport>) => void
  onCancel: () => void
}

export function ProductImportForm({
  initialData,
  onSave,
  onCancel,
}: ProductImportFormProps) {
  const { companies, selectedCompanyId } = useCashFlowStore()

  const [formData, setFormData] = useState<Partial<ProductImport>>({
    company_id: selectedCompanyId || undefined,
    process_number: '',
    description: '',
    international_supplier: '',
    foreign_currency_value: 0,
    foreign_currency_code: 'USD',
    exchange_rate: 1,
    logistics_costs: 0,
    taxes: 0,
    nationalization_costs: 0,
    status: 'Pending',
    start_date: new Date().toISOString().split('T')[0],
    ...initialData,
  })

  // Format dates for input if necessary
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        start_date: initialData.start_date
          ? initialData.start_date.split('T')[0]
          : prev.start_date,
        expected_arrival_date: initialData.expected_arrival_date
          ? initialData.expected_arrival_date.split('T')[0]
          : '',
        actual_arrival_date: initialData.actual_arrival_date
          ? initialData.actual_arrival_date.split('T')[0]
          : '',
      }))
    }
  }, [initialData])

  const handleChange = (field: keyof ProductImport, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.company_id || formData.company_id === 'none') {
      toast.error('Selecione a empresa')
      return
    }
    if (!formData.international_supplier) {
      toast.error('Fornecedor é obrigatório')
      return
    }
    if (!formData.description) {
      toast.error('Descrição é obrigatória')
      return
    }

    onSave(formData)
  }

  const totalValue =
    (formData.foreign_currency_value || 0) * (formData.exchange_rate || 1) +
    (formData.logistics_costs || 0) +
    (formData.taxes || 0) +
    (formData.nationalization_costs || 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(val) => handleChange('status', val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pendente</SelectItem>
              <SelectItem value="In Transit">Em Trânsito</SelectItem>
              <SelectItem value="Customs">Alfândega</SelectItem>
              <SelectItem value="Cleared">Desembaraçado</SelectItem>
              <SelectItem value="Completed">Concluído</SelectItem>
              <SelectItem value="Cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="process_number">Nº Processo</Label>
          <Input
            id="process_number"
            value={formData.process_number}
            onChange={(e) => handleChange('process_number', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier">
            Fornecedor Int. <span className="text-destructive">*</span>
          </Label>
          <Input
            id="supplier"
            value={formData.international_supplier}
            onChange={(e) =>
              handleChange('international_supplier', e.target.value)
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currency">Moeda</Label>
          <Select
            value={formData.foreign_currency_code}
            onValueChange={(val) => handleChange('foreign_currency_code', val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD - Dólar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="GBP">GBP - Libra</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="value_fx">Valor (ME)</Label>
          <Input
            id="value_fx"
            type="number"
            step="0.01"
            value={formData.foreign_currency_value}
            onChange={(e) =>
              handleChange('foreign_currency_value', parseFloat(e.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate">Taxa Câmbio</Label>
          <Input
            id="rate"
            type="number"
            step="0.0001"
            value={formData.exchange_rate}
            onChange={(e) =>
              handleChange('exchange_rate', parseFloat(e.target.value))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-muted/10">
        <div className="space-y-2">
          <Label htmlFor="logistics">Logística (R$)</Label>
          <Input
            id="logistics"
            type="number"
            step="0.01"
            value={formData.logistics_costs}
            onChange={(e) =>
              handleChange('logistics_costs', parseFloat(e.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxes">Impostos (R$)</Label>
          <Input
            id="taxes"
            type="number"
            step="0.01"
            value={formData.taxes}
            onChange={(e) => handleChange('taxes', parseFloat(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationalization">Nacionalização (R$)</Label>
          <Input
            id="nationalization"
            type="number"
            step="0.01"
            value={formData.nationalization_costs}
            onChange={(e) =>
              handleChange('nationalization_costs', parseFloat(e.target.value))
            }
          />
        </div>
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="total">Custo Total Estimado (R$)</Label>
          <Input
            id="total"
            value={totalValue.toLocaleString('pt-BR', {
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
          <Label htmlFor="start_date">Início</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expected_date">Previsão Chegada</Label>
          <Input
            id="expected_date"
            type="date"
            value={formData.expected_arrival_date || ''}
            onChange={(e) =>
              handleChange('expected_arrival_date', e.target.value)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="actual_date">Chegada Real</Label>
          <Input
            id="actual_date"
            type="date"
            value={formData.actual_arrival_date || ''}
            onChange={(e) =>
              handleChange('actual_arrival_date', e.target.value)
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição do Produto / Lote</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Salvar Importação</Button>
      </div>
    </form>
  )
}
