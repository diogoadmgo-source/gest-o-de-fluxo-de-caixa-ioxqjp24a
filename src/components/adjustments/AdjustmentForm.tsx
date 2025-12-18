import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { FinancialAdjustment } from '@/lib/types'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format, isBefore, parseISO, startOfToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function AdjustmentForm() {
  const { addAdjustment, selectedCompanyId } = useCashFlowStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<FinancialAdjustment>>({
    type: undefined,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    reason: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.type || !formData.amount || !formData.reason) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    if (!formData.date) {
      toast.error('A data é obrigatória.')
      return
    }

    // Retroactive Date Check
    const today = startOfToday()
    const selectedDate = parseISO(formData.date)
    if (isBefore(selectedDate, today)) {
      toast.error('Não é possível realizar lançamentos com data retroativa.')
      return
    }

    setIsSubmitting(true)
    try {
      await addAdjustment({
        ...formData,
        company_id: selectedCompanyId,
        status: 'approved',
      } as FinancialAdjustment)

      toast.success('Ajuste registrado com sucesso!')
      setFormData({
        type: undefined,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        reason: '',
      })
    } catch (error: any) {
      if (error.message && error.message.includes('check_not_retroactive')) {
        toast.error(
          'Erro: Não é possível realizar lançamentos com data retroativa.',
        )
      } else {
        console.error(error)
        toast.error('Erro ao salvar ajuste.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Novo Ajuste</CardTitle>
        <CardDescription>Registre um ajuste no fluxo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Ajuste</Label>
            <Select
              value={formData.type}
              onValueChange={(val: 'credit' | 'debit') =>
                setFormData({ ...formData, type: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Crédito (Entrada)</SelectItem>
                <SelectItem value="debit">Débito (Saída)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.amount || ''}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2 flex flex-col">
            <Label className="mb-1">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? (
                    format(parseISO(formData.date), 'PPP', { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date ? parseISO(formData.date) : undefined}
                  onSelect={(d) =>
                    setFormData({
                      ...formData,
                      date: d ? format(d, 'yyyy-MM-dd') : '',
                    })
                  }
                  disabled={{ before: startOfToday() }}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              placeholder="Descreva o motivo do ajuste..."
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Solicitar Aprovação
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
