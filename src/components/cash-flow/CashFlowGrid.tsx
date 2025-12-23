import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Eye,
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
          <h3 className="font-semibold text-lg">Detalhamento Diário</h3>
          <p className="text-sm text-muted-foreground">
            Visualize as movimentações e o impacto no saldo acumulado dia a dia.
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
                  Entradas
                </TableHead>
                <TableHead className="text-right text-destructive font-semibold min-w-[120px]">
                  Saídas (Total)
                </TableHead>
                <TableHead className="text-right font-bold min-w-[120px] bg-secondary/20">
                  Saldo do Dia
                </TableHead>
                <TableHead className="text-right font-bold bg-primary/5 min-w-[140px]">
                  Saldo Acumulado
                </TableHead>
                <TableHead className="min-w-[100px] text-center">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => {
                const currentDate = parseISO(entry.date)
                const isSelected =
                  format(currentDate, 'yyyy-MM-dd') ===
                  format(selectedDate, 'yyyy-MM-dd')

                const totalOutflow =
                  entry.total_payables +
                  entry.import_payments +
                  entry.customs_cost

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
                    onClick={() => {
                      onSelectDate(currentDate)
                      setReviewEntry(entry)
                    }}
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
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(entry.opening_balance)}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {entry.total_receivables > 0
                        ? `+ ${formatCurrency(entry.total_receivables)}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {totalOutflow > 0
                        ? `- ${formatCurrency(totalOutflow)}`
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
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setReviewEntry(entry)
                        }}
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Dia</DialogTitle>
            <DialogDescription>
              {reviewEntry &&
                format(parseISO(reviewEntry.date), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
            </DialogDescription>
          </DialogHeader>

          {reviewEntry && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/20 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">
                    Saldo Inicial
                  </span>
                  <p className="text-xl font-bold">
                    {formatCurrency(reviewEntry.opening_balance)}
                  </p>
                </div>
                <div
                  className={cn(
                    'p-4 rounded-lg',
                    reviewEntry.accumulated_balance < 0
                      ? 'bg-red-50 text-red-900'
                      : 'bg-emerald-50 text-emerald-900',
                  )}
                >
                  <span className="text-sm font-medium opacity-80">
                    Saldo Final
                  </span>
                  <p className="text-xl font-bold">
                    {formatCurrency(reviewEntry.accumulated_balance)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Movimentações
                </h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Recebimentos (Operacional)
                    </span>
                    <span className="font-bold text-success">
                      {formatCurrency(reviewEntry.total_receivables)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      Pagamentos (Operacional)
                    </span>
                    <span className="font-bold text-destructive">
                      {formatCurrency(reviewEntry.total_payables)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      Pagamentos de Importação
                    </span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(reviewEntry.import_payments)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      Custos Aduaneiros
                    </span>
                    <span className="font-bold text-purple-600">
                      {formatCurrency(reviewEntry.customs_cost)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center pt-2">
                * Clique em "Contas a Pagar" ou "Receber" no menu para ver os
                títulos individuais.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
