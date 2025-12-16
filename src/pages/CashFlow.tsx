import { useState } from 'react'
import { CashFlowGrid } from '@/components/cash-flow/CashFlowGrid'
import { CashFlowFilters } from '@/components/cash-flow/CashFlowFilters'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  RefreshCcw,
  Download,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  DollarSign,
} from 'lucide-react'
import useCashFlowStore from '@/stores/useCashFlowStore'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { ptBR } from 'date-fns/locale'

export default function CashFlow() {
  const { cashFlowEntries, recalculateCashFlow } = useCashFlowStore()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      recalculateCashFlow()
      setLoading(false)
      toast.success('Fluxo recalculado com sucesso!')
    }, 800)
  }

  const chartConfig = {
    balance: {
      label: 'Saldo Projetado',
      color: 'hsl(var(--primary))',
    },
  }

  // Calculate Aggregates for Summary Cards
  const totalReceivables = cashFlowEntries.reduce(
    (acc, curr) => acc + curr.total_receivables,
    0,
  )
  const totalPayables = cashFlowEntries.reduce(
    (acc, curr) => acc + curr.total_payables,
    0,
  )
  const lastBalance =
    cashFlowEntries[cashFlowEntries.length - 1]?.accumulated_balance || 0

  // Prepare Data for Projection Chart (7, 15, 21, 30, 60, 90 days)
  const projectionPoints = [7, 15, 21, 30, 60, 90]
  const chartData = projectionPoints.map((days) => {
    const entry =
      cashFlowEntries[days - 1] || cashFlowEntries[cashFlowEntries.length - 1]
    return {
      day: `${days}d`,
      balance: entry?.accumulated_balance || 0,
    }
  })

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h2>
          <p className="text-muted-foreground">
            Acompanhamento diário e projeções financeiras.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <CashFlowFilters />

      {/* Categorized Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-success" />
              Contas a Receber (90d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {totalReceivables.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-destructive" />
              Contas a Pagar (90d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {totalPayables.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Projeção de Saldo (90d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {lastBalance.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Projeção de Caixa (Curto a Longo Prazo)</CardTitle>
          <CardDescription>
            Evolução do saldo acumulado para os próximos períodos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ChartContainer config={chartConfig}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                />
                <Bar
                  dataKey="balance"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={60}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <CashFlowGrid
        data={cashFlowEntries}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
    </div>
  )
}
