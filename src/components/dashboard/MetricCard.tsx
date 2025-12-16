import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface MetricCardProps {
  title: string
  value: number
  previousValue: number
  trendData: { value: number }[]
  isCurrency?: boolean
}

export function MetricCard({
  title,
  value,
  previousValue,
  trendData,
  isCurrency = true,
}: MetricCardProps) {
  const diff = value - previousValue
  const percentage =
    previousValue !== 0 ? (diff / Math.abs(previousValue)) * 100 : 0
  const isPositive = diff >= 0

  const formattedValue = isCurrency
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value)
    : value.toLocaleString('pt-BR')

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
          {formattedValue}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs">
            {isPositive ? (
              <ArrowUp className="h-4 w-4 text-success mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 text-destructive mr-1" />
            )}
            <span
              className={cn(
                'font-medium',
                isPositive ? 'text-success' : 'text-destructive',
              )}
            >
              {Math.abs(percentage).toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-1">vs. mês anterior</span>
          </div>
          <div className="h-10 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={
                    isPositive
                      ? 'hsl(var(--success))'
                      : 'hsl(var(--destructive))'
                  }
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
