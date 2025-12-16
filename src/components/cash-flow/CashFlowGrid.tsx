import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CashFlowEntry } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Edit2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useState } from 'react'

interface CashFlowGridProps {
  data: CashFlowEntry[]
  onSelectDate: (date: Date) => void
  selectedDate: Date
}

export function CashFlowGrid({
  data,
  onSelectDate,
  selectedDate,
}: CashFlowGridProps) {
  const [reviewEntry, setReviewEntry] = useState<CashFlowEntry | null>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <>
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <h3 className="font-semibold text-lg">Fluxo de Caixa Diário</h3>
          <p className="text-sm text-muted-foreground">
            Visão detalhada das movimentações e saldos projetados.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[120px] sticky left-0 bg-background z-10 font-bold">
                  Data
                </TableHead>
                <TableHead className="text-right text-muted-foreground font-semibold min-w-[120px]">
                  Saldo Inicial
                </TableHead>
                <TableHead className="text-right text-success font-semibold min-w-[120px]">
                  Total a Receber
                </TableHead>
                <TableHead className="text-right text-destructive font-semibold min-w-[120px]">
                  Total a Pagar
                </TableHead>
                <TableHead className="text-right text-orange-500 font-semibold min-w-[120px]">
                  Importações
                </TableHead>
                <TableHead className="text-right text-muted-foreground font-semibold min-w-[120px]">
                  Outras Desp.
                </TableHead>
                <TableHead className="text-right font-bold min-w-[120px] bg-secondary/20">
                  Saldo do Dia
                </TableHead>
                <TableHead className="text-right font-bold bg-primary/5 min-w-[140px]">
                  Saldo Acumulado
                </TableHead>
                <TableHead className="min-w-[180px]">Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => {
                const currentDate = parseISO(entry.date)
                const isSelected =
                  format(currentDate, 'yyyy-MM-dd') ===
                  format(selectedDate, 'yyyy-MM-dd')

                return (
                  <TableRow
                    key={entry.date}
                    className={cn(
                      'cursor-pointer transition-colors',
                      entry.is_weekend
                        ? 'bg-muted/30 hover:bg-muted/50'
                        : 'hover:bg-muted/50',
                      isSelected &&
                        'bg-primary/10 hover:bg-primary/15 border-l-2 border-l-primary',
                    )}
                    onClick={() => onSelectDate(currentDate)}
                  >
                    <TableCell className="font-medium sticky left-0 bg-background z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      <div className="flex flex-col">
                        <span
                          className={cn(isSelected && 'text-primary font-bold')}
                        >
                          {format(currentDate, 'dd/MM/yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {format(currentDate, 'EEEE', { locale: ptBR })}
                        </span>
                        {entry.is_weekend && (
                          <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                            Final de Semana
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <div className="flex items-center justify-end gap-2 group">
                        {formatCurrency(entry.opening_balance)}
                        {isSelected && !entry.is_weekend && (
                          <Edit2 className="h-3 w-3 text-muted-foreground opacity-50" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {entry.total_receivables > 0
                        ? `+ ${formatCurrency(entry.total_receivables)}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {entry.total_payables > 0
                        ? `- ${formatCurrency(entry.total_payables)}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right text-orange-500">
                      {entry.imports > 0
                        ? `- ${formatCurrency(entry.imports)}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {entry.other_expenses > 0
                        ? `- ${formatCurrency(entry.other_expenses)}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold bg-secondary/10">
                      <div
                        className={cn(
                          'flex items-center justify-end gap-1',
                          entry.daily_balance >= 0
                            ? 'text-success'
                            : 'text-destructive',
                        )}
                      >
                        {entry.daily_balance >= 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {formatCurrency(entry.daily_balance)}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-bold bg-primary/5',
                        entry.accumulated_balance < 0
                          ? 'text-destructive'
                          : 'text-primary',
                      )}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {formatCurrency(entry.accumulated_balance)}
                        {entry.has_alert && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{entry.alert_message}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between gap-2">
                        {entry.notes ? (
                          <span
                            className="text-xs text-muted-foreground truncate max-w-[100px]"
                            title={entry.notes}
                          >
                            {entry.notes}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic opacity-50">
                            -
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            setReviewEntry(entry)
                          }}
                        >
                          Revisar lançamento
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={!!reviewEntry}
        onOpenChange={(open) => !open && setReviewEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Lançamento</DialogTitle>
            <DialogDescription>
              {reviewEntry &&
                format(parseISO(reviewEntry.date), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
            </DialogDescription>
          </DialogHeader>

          {reviewEntry && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Saldo Inicial
                  </span>
                  <p className="text-lg font-semibold">
                    {formatCurrency(reviewEntry.opening_balance)}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Saldo Final
                  </span>
                  <p className="text-lg font-semibold">
                    {formatCurrency(reviewEntry.accumulated_balance)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Movimentações
                </span>
                <div className="grid grid-cols-2 gap-2 text-sm border p-3 rounded-md">
                  <span>Recebimentos:</span>
                  <span className="text-right text-success font-medium">
                    {formatCurrency(reviewEntry.total_receivables)}
                  </span>
                  <span>Pagamentos:</span>
                  <span className="text-right text-destructive font-medium">
                    {formatCurrency(reviewEntry.total_payables)}
                  </span>
                  <span>Importações:</span>
                  <span className="text-right text-orange-500 font-medium">
                    {formatCurrency(reviewEntry.imports)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Observações
                </span>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {reviewEntry.notes || 'Nenhuma observação registrada.'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
