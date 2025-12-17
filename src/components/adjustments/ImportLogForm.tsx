import { useState } from 'react'
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
import { ImportHistoryEntry } from '@/lib/types'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'

interface ImportLogFormProps {
  initialData?: ImportHistoryEntry
  onSave: (data: ImportHistoryEntry) => void
  onCancel: () => void
}

export function ImportLogForm({
  initialData,
  onSave,
  onCancel,
}: ImportLogFormProps) {
  const { companies, selectedCompanyId } = useCashFlowStore()

  const [formData, setFormData] = useState<Partial<ImportHistoryEntry>>({
    company_id: selectedCompanyId || undefined,
    filename: '',
    status: 'success',
    total_records: 0,
    success_count: 0,
    error_count: 0,
    error_details: null,
    ...initialData,
  })

  const handleChange = (field: keyof ImportHistoryEntry, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.company_id || formData.company_id === 'none') {
      toast.error('Selecione a empresa')
      return
    }

    if (!formData.filename) {
      toast.error('Informe o nome do arquivo')
      return
    }

    onSave(formData as ImportHistoryEntry)
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
          <Label htmlFor="filename">Nome do Arquivo</Label>
          <Input
            id="filename"
            value={formData.filename}
            onChange={(e) => handleChange('filename', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="total">Total Registros</Label>
          <Input
            id="total"
            type="number"
            value={formData.total_records}
            onChange={(e) =>
              handleChange('total_records', parseInt(e.target.value))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="success_count">Sucessos</Label>
          <Input
            id="success_count"
            type="number"
            value={formData.success_count}
            onChange={(e) =>
              handleChange('success_count', parseInt(e.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="error_count">Erros</Label>
          <Input
            id="error_count"
            type="number"
            value={formData.error_count}
            onChange={(e) =>
              handleChange('error_count', parseInt(e.target.value))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">Detalhes do Erro (JSON ou Texto)</Label>
        <Textarea
          id="details"
          value={
            typeof formData.error_details === 'string'
              ? formData.error_details
              : JSON.stringify(formData.error_details, null, 2)
          }
          onChange={(e) => handleChange('error_details', e.target.value)}
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
