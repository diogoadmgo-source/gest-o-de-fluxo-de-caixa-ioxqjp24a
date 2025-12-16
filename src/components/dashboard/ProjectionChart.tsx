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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { DailyBalance } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ProjectionChartProps {
  data: DailyBalance[]
}

const chartConfig = {
  closing_balance: {
    label: 'Saldo de Caixa',
    color: 'hsl(var(--primary))',
  },
}

export function ProjectionChart({ data }: ProjectionChartProps) {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Projeção de Fluxo de Caixa (30 dias)</CardTitle>
        <CardDescription>
          Acompanhamento e previsão do saldo diário
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ChartContainer config={chartConfig}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
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
                dataKey="date"
                tickFormatter={(value) =>
                  format(parseISO(value), 'dd/MM', { locale: ptBR })
                }
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine
                y={0}
                stroke="hsl(var(--destructive))"
                strokeDasharray="3 3"
              />
              <Area
                type="monotone"
                dataKey="closing_balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
