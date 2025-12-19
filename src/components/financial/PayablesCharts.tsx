import { useQuery } from '@/hooks/use-query'
import { getPayableChartsData } from '@/services/financial'
import { PayableChartData } from '@/lib/types'
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
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'

interface PayablesChartsProps {
  companyId: string
  filters: any
}

const timelineConfig = {
  total: {
    label: 'Total',
    color: 'hsl(var(--primary))',
  },
}

const supplierConfig = {
  value: {
    label: 'Valor',
    color: 'hsl(var(--chart-1))',
  },
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export function PayablesCharts({ companyId, filters }: PayablesChartsProps) {
  const { data, isLoading } = useQuery<PayableChartData>(
    `payables-charts-${companyId}-${JSON.stringify(filters)}`,
    () => getPayableChartsData(companyId, filters),
    {
      enabled: !!companyId && companyId !== 'all',
      staleTime: 60000,
    },
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || (!data.timeline.length && !data.suppliers.length)) {
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
      {/* Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Vencimento</CardTitle>
          <CardDescription>
            Valores a pagar por data de vencimento (Filtrado)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ChartContainer config={timelineConfig}>
              <BarChart
                data={data.timeline}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    try {
                      return format(parseISO(value), 'dd/MM', { locale: ptBR })
                    } catch {
                      return value
                    }
                  }}
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
                  dataKey="total"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Fornecedores</CardTitle>
          <CardDescription>
            Distribuição de valores por fornecedor (Top 10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ChartContainer config={supplierConfig}>
              <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <Pie
                  data={data.suppliers}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) =>
                    entry.value > 0 ? entry.name.substring(0, 15) + '...' : ''
                  }
                  labelLine={false}
                >
                  {data.suppliers.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      formatter={(value) =>
                        Number(value).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      }
                    />
                  }
                />
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
