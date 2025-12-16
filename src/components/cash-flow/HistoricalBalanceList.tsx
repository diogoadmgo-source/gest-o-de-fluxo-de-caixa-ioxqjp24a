import { HistoricalBalance } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, parseISO } from 'date-fns'
import { History, UserCheck } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

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
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-md flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico de Saldos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px] lg:h-[600px]">
          <div className="flex flex-col">
            {history.map((item) => {
              const itemDate = parseISO(item.date)
              const isSelected =
                format(itemDate, 'yyyy-MM-dd') ===
                format(selectedDate, 'yyyy-MM-dd')

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectDate(itemDate)}
                  className={cn(
                    'p-4 border-b cursor-pointer transition-colors hover:bg-muted/50',
                    isSelected && 'bg-primary/5 border-l-4 border-l-primary',
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">
                      {format(itemDate, 'dd/MM/yyyy')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(item.timestamp), 'HH:mm')}
                    </span>
                  </div>
                  <div className="font-bold text-primary mb-2">
                    {item.consolidated_balance.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserCheck className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">
                      {item.user_name}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
