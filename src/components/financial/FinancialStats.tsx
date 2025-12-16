import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatItem {
  label: string
  principal: number
  fine: number
  interest: number
  total: number
  color:
    | 'default'
    | 'success'
    | 'destructive'
    | 'warning'
    | 'primary'
    | 'custom-red'
    | 'custom-green'
  icon?: React.ElementType
  onClick?: () => void
}

interface FinancialStatsProps {
  stats: StatItem[]
}

export function FinancialStats({ stats }: FinancialStatsProps) {
  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div
      className={cn(
        'grid gap-4',
        stats.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2',
      )}
    >
      {stats.map((stat, index) => {
        // Resolve custom colors as requested in user story
        const isCustomRed = stat.color === 'custom-red'
        const isCustomGreen = stat.color === 'custom-green'

        return (
          <Card
            key={index}
            onClick={stat.onClick}
            className={cn('border-l-4 transition-all', {
              'cursor-pointer hover:shadow-md': !!stat.onClick,
              'border-l-success': stat.color === 'success',
              'border-l-destructive': stat.color === 'destructive',
              'border-l-warning': stat.color === 'warning',
              'border-l-primary': stat.color === 'primary',
              'border-l-red-600': isCustomRed,
              'border-l-green-800': isCustomGreen,
            })}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              {stat.icon ? (
                <stat.icon
                  className={cn('h-4 w-4', {
                    'text-success': stat.color === 'success',
                    'text-destructive': stat.color === 'destructive',
                    'text-warning': stat.color === 'warning',
                    'text-primary': stat.color === 'primary',
                    'text-red-600': isCustomRed,
                    'text-green-800': isCustomGreen,
                  })}
                />
              ) : (
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={cn('text-2xl font-bold mb-2', {
                  'text-success': stat.color === 'success',
                  'text-destructive': stat.color === 'destructive',
                  'text-primary': stat.color === 'primary',
                  'text-red-600': isCustomRed,
                  'text-green-800': isCustomGreen,
                })}
              >
                {formatCurrency(stat.total)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground border-t pt-2">
                <div>
                  <p className="font-semibold">Principal</p>
                  <p>{formatCurrency(stat.principal)}</p>
                </div>
                <div>
                  <p className="font-semibold">Multa</p>
                  <p>{formatCurrency(stat.fine)}</p>
                </div>
                <div>
                  <p className="font-semibold">Juros</p>
                  <p>{formatCurrency(stat.interest)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
