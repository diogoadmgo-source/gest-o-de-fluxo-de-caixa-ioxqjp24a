import { HistoricalBalance } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, parseISO } from 'date-fns'
import { History, UserCheck } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface HistoricalBalanceListProps {
  history: HistoricalBalance[]
  onSelectDate: (date: Date) => void
  selectedDate: Date
}

export function HistoricalBalanceList({
  history,
  onSelectDate,
  selectedDate,
}: HistoricalBalanceListProps) {
  // Sort history by date desc
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-md flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico de Saldos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[400px] lg:h-[600px] w-full">
          <div className="p-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Data</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="w-[120px]">Resp.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-4"
                    >
                      Nenhum histórico disponível.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedHistory.map((item) => {
                    const itemDate = parseISO(item.date)
                    const isSelected =
                      format(itemDate, 'yyyy-MM-dd') ===
                      format(selectedDate, 'yyyy-MM-dd')

                    return (
                      <TableRow
                        key={item.id}
                        onClick={() => onSelectDate(itemDate)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isSelected && 'bg-primary/10 hover:bg-primary/20',
                        )}
                      >
                        <TableCell className="font-medium">
                          {format(itemDate, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {item.consolidated_balance.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <UserCheck className="h-3 w-3" />
                            <span className="truncate max-w-[80px]">
                              {item.user_name}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
