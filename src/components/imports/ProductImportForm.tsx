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
import { Calendar } from 'lucide-react'

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

    line: '',
    situation: '',
    nf_number: '',
    balance: 0,
    due_date: '',
    clearance_forecast_date: '',
    estimate_without_tax: 0,
    icms_tax: 0,
    final_clearance_estimate: 0,
    clearance_status: 'Em cotação',

    // Defaults for compatibility
    status: 'Pending',
    start_date: new Date().toISOString().split('T')[0],
    ...initialData,
  })

  // Format dates for input if necessary
  useEffect(() => {
    if (initialData) {
      const formatDate = (d: string | undefined) => (d ? d.split('T')[0] : '')
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        due_date: formatDate(initialData.due_date),
        clearance_forecast_date: formatDate(
          initialData.clearance_forecast_date,
        ),
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
    if (!formData.process_number) {
      toast.error('Invoice/Processo é obrigatório')
      return
    }
    if (!formData.international_supplier) {
      toast.error('Fornecedor é obrigatório')
      return
    }

    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          <Label htmlFor="line">Linha</Label>
          <Input
            id="line"
            value={formData.line || ''}
            onChange={(e) => handleChange('line', e.target.value)}
            placeholder="Ex: P&P, VET, UIS..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="process_number">
            Invoice / Processo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="process_number"
            value={formData.process_number || ''}
            onChange={(e) => handleChange('process_number', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="supplier">
            Fornecedor Internacional <span className="text-destructive">*</span>
          </Label>
          <Input
            id="supplier"
            value={formData.international_supplier || ''}
            onChange={(e) =>
              handleChange('international_supplier', e.target.value)
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="situation">Situação Operacional</Label>
          <Input
            id="situation"
            value={formData.situation || ''}
            onChange={(e) => handleChange('situation', e.target.value)}
            placeholder="Ex: Em desembaraço"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nf_number">Nota Fiscal (NF)</Label>
          <Input
            id="nf_number"
            value={formData.nf_number || ''}
            onChange={(e) => handleChange('nf_number', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clearance_status">Status Desembaraço</Label>
          <Select
            value={formData.clearance_status}
            onValueChange={(val) => handleChange('clearance_status', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Em cotação">Em cotação</SelectItem>
              <SelectItem value="Em produção">Em produção</SelectItem>
              <SelectItem value="Em Trânsito">Em Trânsito</SelectItem>
              <SelectItem value="Desembaraço">Desembaraço</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/10">
        <div className="space-y-2">
          <Label htmlFor="balance">Saldo (R$)</Label>
          <Input
            id="balance"
            type="number"
            step="0.01"
            value={formData.balance}
            onChange={(e) =>
              handleChange('balance', parseFloat(e.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimate_without_tax">Est. sem Imposto (R$)</Label>
          <Input
            id="estimate_without_tax"
            type="number"
            step="0.01"
            value={formData.estimate_without_tax}
            onChange={(e) =>
              handleChange('estimate_without_tax', parseFloat(e.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="icms_tax">Incidência ICMS (R$)</Label>
          <Input
            id="icms_tax"
            type="number"
            step="0.01"
            value={formData.icms_tax}
            onChange={(e) =>
              handleChange('icms_tax', parseFloat(e.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="final_estimate"
            className="font-semibold text-primary"
          >
            Est. Valor Final (R$)
          </Label>
          <Input
            id="final_estimate"
            type="number"
            step="0.01"
            className="font-semibold border-primary/30 bg-background"
            value={formData.final_clearance_estimate}
            onChange={(e) =>
              handleChange(
                'final_clearance_estimate',
                parseFloat(e.target.value),
              )
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="due_date" className="flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Vencimento
          </Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date || ''}
            onChange={(e) => handleChange('due_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="clearance_forecast_date"
            className="flex items-center gap-2"
          >
            <Calendar className="w-3 h-3" /> Previsão Desembaraço
          </Label>
          <Input
            id="clearance_forecast_date"
            type="date"
            value={formData.clearance_forecast_date || ''}
            onChange={(e) =>
              handleChange('clearance_forecast_date', e.target.value)
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição / Detalhes</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Salvar Registro</Button>
      </div>
    </form>
  )
}
