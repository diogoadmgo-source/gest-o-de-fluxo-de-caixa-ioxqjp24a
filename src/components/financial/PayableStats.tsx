import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Clock,
  DollarSign,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PayableStatsProps {
  totalToPay: number
  overdue: number
  dueIn7Days: number
  dueIn30Days: number
  nextMaturityDate: string | null
  nextMaturityValue: number
  totalCount: number
}

export function PayableStats({
  totalToPay,
  overdue,
  dueIn7Days,
  dueIn30Days,
  nextMaturityDate,
  nextMaturityValue,
  totalCount,
}: PayableStatsProps) {
  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const cards = [
    {
      label: 'Total a Pagar',
      value: formatCurrency(totalToPay),
      icon: DollarSign,
      color: 'primary',
      description: 'Montante total',
    },
    {
      label: 'Vencido',
      value: formatCurrency(overdue),
      icon: AlertCircle,
      color: 'destructive',
      description: 'Requer atenção imediata',
    },
    {
      label: 'Vence em 7 Dias',
      value: formatCurrency(dueIn7Days),
      icon: Clock,
      color: 'warning',
      description: 'Curto prazo',
    },
    {
      label: 'Vence em 30 Dias',
      value: formatCurrency(dueIn30Days),
      icon: Calendar,
      color: 'info',
      description: 'Médio prazo',
    },
    {
      label: 'Próximo Vencimento',
      value: nextMaturityDate
        ? new Date(nextMaturityDate).toLocaleDateString('pt-BR')
        : 'N/A',
      secondaryValue: nextMaturityValue
        ? formatCurrency(nextMaturityValue)
        : '',
      icon: CalendarDays,
      color: 'success',
      description: 'Data mais próxima',
    },
    {
      label: 'Qtd. Títulos',
      value: totalCount.toString(),
      icon: List,
      color: 'default',
      description: 'Listados na tela',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={cn('border-l-4 shadow-sm', {
            'border-l-primary': card.color === 'primary',
            'border-l-destructive': card.color === 'destructive',
            'border-l-yellow-500': card.color === 'warning',
            'border-l-blue-500': card.color === 'info',
            'border-l-emerald-500': card.color === 'success',
            'border-l-muted-foreground': card.color === 'default',
          })}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon
              className={cn('h-4 w-4', {
                'text-primary': card.color === 'primary',
                'text-destructive': card.color === 'destructive',
                'text-yellow-500': card.color === 'warning',
                'text-blue-500': card.color === 'info',
                'text-emerald-500': card.color === 'success',
                'text-muted-foreground': card.color === 'default',
              })}
            />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold truncate" title={card.value}>
              {card.value}
            </div>
            {card.secondaryValue && (
              <div className="text-xs font-medium text-muted-foreground">
                {card.secondaryValue}
              </div>
            )}
            {!card.secondaryValue && card.description && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {card.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
