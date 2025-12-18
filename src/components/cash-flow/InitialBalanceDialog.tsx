import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'

interface InitialBalanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (date: Date, amount: number) => void
  defaultDate?: Date
}

export function InitialBalanceDialog({
  open,
  onOpenChange,
  onSave,
  defaultDate = new Date(),
}: InitialBalanceDialogProps) {
  const [date, setDate] = useState<Date | undefined>(defaultDate)
  const [amount, setAmount] = useState<string>('')

  const handleSave = () => {
    if (date && amount) {
      const val = parseFloat(amount)

      if (isNaN(val)) {
        toast.error('Valor inválido.')
        return
      }

      if (val < 0) {
        toast.error('O saldo não pode ser negativo.')
        return
      }

      onSave(date, val)
      onOpenChange(false)
      setAmount('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Saldo Inicial</DialogTitle>
          <DialogDescription>
            Defina o saldo inicial para uma data específica. Isso recalculará o
            fluxo de caixa a partir desta data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Data de Corte</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? (
                    format(date, 'PPP', { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Valor do Saldo (R$)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!date || !amount}>
            Salvar e Reprocessar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
