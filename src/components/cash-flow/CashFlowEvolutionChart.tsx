import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
} from 'recharts'
import { CashFlowEntry } from '@/lib/types'
import { format, addDays, parseISO, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CashFlowEvolutionChartProps {
  data: CashFlowEntry[]
}

const chartConfig = {
  balance: {
    label: 'Saldo Projetado',
    color: 'hsl(var(--primary))',
  },
}

export function CashFlowEvolutionChart({ data }: CashFlowEvolutionChartProps) {
  const today = startOfDay(new Date())
  const intervals = [7, 15, 21, 30, 60, 90]

  const chartData = intervals.map((days) => {
    const targetDate = addDays(today, days)
    // Find entry with same date
    const entry = data.find((e) => isSameDay(parseISO(e.date), targetDate))
    // Fallback: find closest previous entry if exact date missing (e.g. weekends)
    const fallbackEntry = !entry
      ? [...data]
          .sort(
            (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime(),
          )
          .filter((e) => parseISO(e.date) <= targetDate)
          .pop()
      : null

    return {
      label: `${days}d`,
      date: format(targetDate, 'dd/MM'),
      fullDate: format(targetDate, 'dd/MM/yyyy'),
      balance: entry
        ? entry.accumulated_balance
        : fallbackEntry
          ? fallbackEntry.accumulated_balance
          : 0,
    }
  })

  return (
    <Card className="col-span-1 shadow-md border-l-4 border-l-primary/50">
      <CardHeader>
        <CardTitle>Evolução de Liquidez (Horizonte)</CardTitle>
        <CardDescription>
          Projeção do saldo acumulado para 7, 15, 21, 30, 60 e 90 dias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat('pt-BR', {
                      notation: 'compact',
                      compactDisplay: 'short',
                      currency: 'BRL',
                      style: 'currency',
                    }).format(value)
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: any) =>
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(value)
                      }
                      labelFormatter={(_, payload) => {
                        if (payload && payload.length > 0) {
                          return `Projeção para ${payload[0].payload.fullDate} (${payload[0].payload.label})`
                        }
                        return ''
                      }}
                    />
                  }
                />
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                />
                <Bar
                  dataKey="balance"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                  name="Saldo Projetado"
                  fillOpacity={0.8}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: 'hsl(var(--background))',
                    strokeWidth: 2,
                    stroke: 'hsl(var(--primary))',
                  }}
                  activeDot={{
                    r: 6,
                    strokeWidth: 0,
                  }}
                  name="Tendência"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
