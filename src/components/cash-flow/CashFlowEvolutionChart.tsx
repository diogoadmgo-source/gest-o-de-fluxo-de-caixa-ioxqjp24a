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
  Area,
} from 'recharts'
import { CashFlowEntry } from '@/lib/types'
import { format, parseISO } from 'date-fns'

interface CashFlowEvolutionChartProps {
  data: CashFlowEntry[]
}

const chartConfig = {
  accumulated_balance: {
    label: 'Saldo Projetado',
    color: 'hsl(var(--primary))',
  },
  total_receivables: { label: 'Entradas', color: '#10b981' },
  total_payables: { label: 'Pagamentos Operacionais', color: '#f43f5e' },
  import_payments: { label: 'Pagamentos Importação', color: '#f97316' },
  customs_cost: { label: 'Custos Aduaneiros', color: '#8b5cf6' },
}

export function CashFlowEvolutionChart({ data }: CashFlowEvolutionChartProps) {
  // Transform data for chart
  // We negate outflows to stack them downwards
  const chartData = data.map((entry) => ({
    ...entry,
    displayDate: format(parseISO(entry.date), 'dd/MM'),
    // Outflows as negative for stacking
    payables_neg: -entry.total_payables,
    imports_neg: -entry.import_payments,
    customs_neg: -entry.customs_cost,
  }))

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Evolução do Saldo Diário</CardTitle>
        <CardDescription>
          Projeção acumulada vs Entradas e Saídas diárias
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
                <defs>
                  <linearGradient id="fillBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="displayDate"
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
                      formatter={(value, name, item) => {
                        const valNum = Number(value)
                        // Match config label
                        let label = name
                        if (name === 'payables_neg')
                          label = chartConfig.total_payables.label
                        if (name === 'imports_neg')
                          label = chartConfig.import_payments.label
                        if (name === 'customs_neg')
                          label = chartConfig.customs_cost.label
                        if (name === 'total_receivables')
                          label = chartConfig.total_receivables.label
                        if (name === 'accumulated_balance')
                          label = chartConfig.accumulated_balance.label

                        return (
                          <div className="flex min-w-[150px] items-center text-xs text-muted-foreground gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{label}</span>
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
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />

                {/* Balance Area */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="accumulated_balance"
                  stroke="var(--color-accumulated_balance)"
                  fill="url(#fillBalance)"
                  strokeWidth={3}
                />

                {/* Inflows */}
                <Bar
                  yAxisId="right"
                  dataKey="total_receivables"
                  fill="var(--color-total_receivables)"
                  radius={[4, 4, 0, 0]}
                  barSize={12}
                  fillOpacity={0.8}
                />

                {/* Outflows Stacked */}
                <Bar
                  yAxisId="right"
                  dataKey="payables_neg"
                  stackId="outflow"
                  fill="var(--color-total_payables)"
                  barSize={12}
                  fillOpacity={0.8}
                />
                <Bar
                  yAxisId="right"
                  dataKey="imports_neg"
                  stackId="outflow"
                  fill="var(--color-import_payments)"
                  barSize={12}
                  fillOpacity={0.8}
                />
                <Bar
                  yAxisId="right"
                  dataKey="customs_neg"
                  stackId="outflow"
                  fill="var(--color-customs_cost)"
                  radius={[0, 0, 4, 4]}
                  barSize={12}
                  fillOpacity={0.8}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
