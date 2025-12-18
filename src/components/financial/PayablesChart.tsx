import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { Transaction } from '@/lib/types'
import { format, parseISO, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo } from 'react'

interface PayablesChartProps {
  data: Transaction[]
}

const chartConfig = {
  amount: {
    label: 'Valor Total',
    color: 'hsl(var(--primary))',
  },
}

export function PayablesChart({ data }: PayablesChartProps) {
  const chartData = useMemo(() => {
    // Group by Date
    const grouped = data.reduce(
      (acc, curr) => {
        const date = curr.due_date
        if (!acc[date]) {
          acc[date] = 0
        }
        acc[date] += curr.amount
        return acc
      },
      {} as Record<string, number>,
    )

    // Convert to array and sort
    const sorted = Object.entries(grouped)
      .map(([date, amount]) => ({
        date,
        amount,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Limit to reasonable number of bars if too many? For now show all filtered.
    return sorted
  }, [data])

  const totalValue = chartData.reduce((acc, curr) => acc + curr.amount, 0)

  if (chartData.length === 0) return null

  return (
    <Card className="col-span-1 md:col-span-2 animate-fade-in">
      <CardHeader>
        <CardTitle>Cronograma de Pagamentos</CardTitle>
        <CardDescription>
          Distribuição dos {chartData.length} vencimentos filtrados (Total:{' '}
          {totalValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
          )
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ChartContainer config={chartConfig}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  format(parseISO(value), 'dd/MM', { locale: ptBR })
                }
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={20}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      Number(value).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    }
                  />
                }
              />
              <Bar
                dataKey="amount"
                fill="url(#colorAmount)"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
