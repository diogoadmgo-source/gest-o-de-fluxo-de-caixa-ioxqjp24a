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
  ChartLegend,
  ChartLegendContent,
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
import { format, parseISO } from 'date-fns'

interface CashFlowEvolutionChartProps {
  data: CashFlowEntry[]
}

const chartConfig = {
  balance: { label: 'Saldo Acumulado', color: 'hsl(var(--primary))' },
  inflow: { label: 'Entradas', color: '#10b981' },
  outflow: { label: 'Saídas', color: '#f43f5e' },
}

export function CashFlowEvolutionChart({ data }: CashFlowEvolutionChartProps) {
  const chartData = data.map((entry) => ({
    date: format(parseISO(entry.date), 'dd/MM'),
    fullDate: format(parseISO(entry.date), 'dd/MM/yyyy'),
    balance: entry.accumulated_balance,
    inflow: entry.total_receivables,
    outflow: entry.total_payables,
  }))

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Projeção de Caixa</CardTitle>
        <CardDescription>
          Comparativo de Entradas, Saídas e Saldo Acumulado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
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
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--primary))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) =>
                    new Intl.NumberFormat('pt-BR', {
                      notation: 'compact',
                      compactDisplay: 'short',
                    }).format(val)
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) =>
                    new Intl.NumberFormat('pt-BR', {
                      notation: 'compact',
                      compactDisplay: 'short',
                    }).format(val)
                  }
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <ReferenceLine
                  y={0}
                  yAxisId="left"
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                />

                <Bar
                  yAxisId="right"
                  dataKey="inflow"
                  fill="var(--color-inflow)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  fillOpacity={0.6}
                />
                <Bar
                  yAxisId="right"
                  dataKey="outflow"
                  fill="var(--color-outflow)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  fillOpacity={0.6}
                />

                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--color-balance)"
                  strokeWidth={3}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
