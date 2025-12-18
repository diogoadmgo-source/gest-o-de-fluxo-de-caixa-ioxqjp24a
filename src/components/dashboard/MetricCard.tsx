import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface MetricCardProps {
  title: string
  value: number
  previousValue?: number
  trendData?: { value: number }[]
  isCurrency?: boolean
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
}

export function MetricCard({
  title,
  value,
  previousValue,
  trendData,
  isCurrency = true,
  description,
  trend,
  trendLabel,
}: MetricCardProps) {
  let calculatedTrend = trend
  let percentage = 0

  if (previousValue !== undefined && previousValue !== 0) {
    const diff = value - previousValue
    percentage = (diff / Math.abs(previousValue)) * 100
    if (!calculatedTrend) {
      calculatedTrend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
    }
  }

  const formattedValue = isCurrency
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value)
    : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

  const getValueSizeClass = (length: number) => {
    if (length > 20) return 'text-lg md:text-xl'
    if (length > 15) return 'text-xl md:text-2xl'
    return 'text-2xl md:text-3xl'
  }

  const valueSizeClass = getValueSizeClass(formattedValue.length)

  // Determine colors based on trend intent (sometimes up is bad, like PMR)
  // For generic metric card, we assume green is good for Up if not specified otherwise
  const trendColor =
    calculatedTrend === 'up'
      ? 'text-emerald-500'
      : calculatedTrend === 'down'
        ? 'text-rose-500'
        : 'text-muted-foreground'

  const chartColor =
    calculatedTrend === 'up'
      ? '#10b981' // emerald-500
      : calculatedTrend === 'down'
        ? '#f43f5e' // rose-500
        : '#94a3b8' // slate-400

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-l-4 border-l-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground truncate">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-end">
          <div>
            <div
              className={cn(
                'font-bold text-foreground mb-1 tracking-tight',
                valueSizeClass,
              )}
            >
              {formattedValue}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
            {(previousValue !== undefined || trendLabel) && (
              <div className="flex items-center mt-1 space-x-2">
                <span
                  className={cn(
                    'flex items-center text-xs font-medium',
                    trendColor,
                  )}
                >
                  {calculatedTrend === 'up' && (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  )}
                  {calculatedTrend === 'down' && (
                    <ArrowDown className="h-3 w-3 mr-1" />
                  )}
                  {calculatedTrend === 'neutral' && (
                    <Minus className="h-3 w-3 mr-1" />
                  )}
                  {percentage !== 0 && `${Math.abs(percentage).toFixed(1)}%`}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {trendLabel || 'vs. mês anterior'}
                </span>
              </div>
            )}
          </div>

          {trendData && trendData.length > 0 && (
            <div className="h-12 w-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient
                      id={`gradient-${title}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={chartColor}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="100%"
                        stopColor={chartColor}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartColor}
                    strokeWidth={2}
                    fill={`url(#gradient-${title})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
