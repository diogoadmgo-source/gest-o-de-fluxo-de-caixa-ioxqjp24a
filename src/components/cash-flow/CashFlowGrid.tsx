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

interface CashFlowGridProps {
  data: CashFlowEntry[]
  onEditInitialBalance: (date: string) => void
}

export function CashFlowGrid({
  data,
  onEditInitialBalance,
}: CashFlowGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[120px]">Data</TableHead>
            <TableHead className="text-right text-muted-foreground">
              Saldo Inicial
            </TableHead>
            <TableHead className="text-right text-success">
              Recebimentos
            </TableHead>
            <TableHead className="text-right text-destructive">
              Pagamentos
            </TableHead>
            <TableHead className="text-right text-orange-500">
              Importações
            </TableHead>
            <TableHead className="text-right text-muted-foreground">
              Outras Desp.
            </TableHead>
            <TableHead className="text-right font-bold">Saldo do Dia</TableHead>
            <TableHead className="text-right font-bold bg-muted/20">
              Saldo Acumulado
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((entry) => (
            <TableRow
              key={entry.date}
              className={cn(entry.is_projected && 'bg-muted/10')}
            >
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{format(parseISO(entry.date), 'dd/MM/yyyy')}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {format(parseISO(entry.date), 'EEEE', { locale: ptBR })}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                <div className="flex items-center justify-end gap-2 group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onEditInitialBalance(entry.date)}
                    title="Ajustar Saldo Inicial"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {formatCurrency(entry.opening_balance)}
                </div>
              </TableCell>
              <TableCell className="text-right text-success">
                {entry.receivables > 0
                  ? `+ ${formatCurrency(entry.receivables)}`
                  : '-'}
              </TableCell>
              <TableCell className="text-right text-destructive">
                {entry.payables > 0
                  ? `- ${formatCurrency(entry.payables)}`
                  : '-'}
              </TableCell>
              <TableCell className="text-right text-orange-500">
                {entry.imports > 0 ? `- ${formatCurrency(entry.imports)}` : '-'}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {entry.other_expenses > 0
                  ? `- ${formatCurrency(entry.other_expenses)}`
                  : '-'}
              </TableCell>
              <TableCell className="text-right font-bold">
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
                  'text-right font-bold bg-muted/20',
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
                {entry.notes && (
                  <Badge
                    variant="outline"
                    className="text-[10px] whitespace-nowrap"
                  >
                    {entry.notes}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
