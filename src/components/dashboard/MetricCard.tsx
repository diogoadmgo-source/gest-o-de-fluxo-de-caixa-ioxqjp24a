import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown } from 'lucide-react'
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

  // Dynamic font size calculation based on value length to prevent overflow
  // R$ 20.479.597,84 is approx 16-17 chars
  const getValueSizeClass = (length: number) => {
    if (length > 20) return 'text-lg md:text-xl'
    if (length > 15) return 'text-xl md:text-2xl'
    return 'text-2xl md:text-3xl'
  }

  const valueSizeClass = getValueSizeClass(formattedValue.length)

  return (
    <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle
          className="text-sm font-medium text-muted-foreground truncate"
          title={title}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'font-bold text-foreground mb-1 truncate',
            valueSizeClass,
          )}
          title={formattedValue}
        >
          {formattedValue}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs whitespace-nowrap overflow-hidden">
            {isPositive ? (
              <ArrowUp className="h-4 w-4 text-success mr-1 shrink-0" />
            ) : (
              <ArrowDown className="h-4 w-4 text-destructive mr-1 shrink-0" />
            )}
            <span
              className={cn(
                'font-medium shrink-0',
                isPositive ? 'text-success' : 'text-destructive',
              )}
            >
              {Math.abs(percentage).toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-1 truncate max-w-[80px] md:max-w-none">
              vs. mês anterior
            </span>
          </div>
          <div className="h-10 w-20 shrink-0 ml-2">
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
