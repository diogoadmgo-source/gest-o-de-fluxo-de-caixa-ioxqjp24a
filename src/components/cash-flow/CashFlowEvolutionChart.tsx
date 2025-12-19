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
  inflow: { label: 'Entradas (Recebíveis)', color: '#10b981' },
  payables: { label: 'Pagamentos Operacionais', color: '#f43f5e' },
  imports: { label: 'Pagamentos Importação', color: '#f97316' }, // orange-500
  customs: { label: 'Custos Aduaneiros', color: '#8b5cf6' }, // violet-500
}

export function CashFlowEvolutionChart({ data }: CashFlowEvolutionChartProps) {
  const chartData = data.map((entry) => ({
    date: format(parseISO(entry.date), 'dd/MM'),
    fullDate: format(parseISO(entry.date), 'dd/MM/yyyy'),
    balance: entry.accumulated_balance,
    inflow: entry.total_receivables,
    // Negative values for stacking downwards
    payables: -entry.total_payables,
    imports: -entry.import_payments,
    customs: -entry.customs_cost,
  }))

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Projeção de Caixa Detalhada</CardTitle>
        <CardDescription>
          Fluxo diário de entradas e saídas (Operacional, Importação e
          Aduaneiro)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                stackOffset="sign"
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
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        const valNum = Number(value)
                        return (
                          <div className="flex min-w-[130px] items-center text-xs text-muted-foreground">
                            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[--color-bg]" />
                            {chartConfig[name as keyof typeof chartConfig]
                              ?.label || name}
                            <div className="ml-auto font-mono font-medium text-foreground">
                              {Math.abs(valNum).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </div>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <ReferenceLine
                  y={0}
                  yAxisId="left"
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                />

                {/* Inflows */}
                <Bar
                  yAxisId="right"
                  dataKey="inflow"
                  fill="var(--color-inflow)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  fillOpacity={0.8}
                />

                {/* Outflows Stacked */}
                <Bar
                  yAxisId="right"
                  dataKey="payables"
                  stackId="outflow"
                  fill="var(--color-payables)"
                  radius={[0, 0, 4, 4]} // Rounded bottom for the last one usually, but hard to know order.
                  barSize={20}
                  fillOpacity={0.8}
                />
                <Bar
                  yAxisId="right"
                  dataKey="imports"
                  stackId="outflow"
                  fill="var(--color-imports)"
                  barSize={20}
                  fillOpacity={0.8}
                />
                <Bar
                  yAxisId="right"
                  dataKey="customs"
                  stackId="outflow"
                  fill="var(--color-customs)"
                  radius={[0, 0, 4, 4]}
                  barSize={20}
                  fillOpacity={0.8}
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
