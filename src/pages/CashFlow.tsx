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
import {
  format,
  addDays,
  isWithinInterval,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns'
import {
  RefreshCcw,
  Download,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  CalendarIcon,
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
} from 'recharts'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { ptBR } from 'date-fns/locale'

export default function CashFlow() {
  const { cashFlowEntries, recalculateCashFlow } = useCashFlowStore()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)

  // Default to today + 30 days
  const [dateRange, setDateRange] = useState<{
    from: Date
    to: Date
  }>({
    from: new Date(),
    to: addDays(new Date(), 30),
  })

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      recalculateCashFlow()
      setLoading(false)
      toast.success('Fluxo recalculado com sucesso!')
    }, 800)
  }

  // Filter Data based on Date Range
  const filteredEntries = cashFlowEntries.filter((entry) => {
    if (!dateRange.from || !dateRange.to) return true
    const entryDate = parseISO(entry.date)
    return isWithinInterval(entryDate, {
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to),
    })
  })

  const chartConfig = {
    balance: {
      label: 'Saldo Projetado',
      color: 'hsl(var(--primary))',
    },
  }

  const totalReceivables = filteredEntries.reduce(
    (acc, curr) => acc + curr.total_receivables,
    0,
  )
  const totalPayables = filteredEntries.reduce(
    (acc, curr) => acc + curr.total_payables,
    0,
  )
  const lastBalance =
    filteredEntries[filteredEntries.length - 1]?.accumulated_balance || 0

  const chartData = filteredEntries.map((entry) => ({
    day: format(parseISO(entry.date), 'dd/MM'),
    balance: entry.accumulated_balance,
  }))

  const setRangeDays = (days: number) => {
    setDateRange({
      from: new Date(),
      to: addDays(new Date(), days),
    })
  }

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

      <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
        <CashFlowFilters />

        {/* Date Range Picker & Quick Select */}
        <div className="flex flex-col md:flex-row gap-2 items-end md:items-center">
          <div className="flex gap-1 bg-muted p-1 rounded-md">
            {[7, 15, 21, 30, 60, 90].map((days) => (
              <Button
                key={days}
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setRangeDays(days)}
              >
                {days}d
              </Button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-[240px] justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd/MM/yyyy')} -{' '}
                        {format(dateRange.to, 'dd/MM/yyyy')}
                      </>
                    ) : (
                      format(dateRange.from, 'dd/MM/yyyy')
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range: any) => range && setDateRange(range)}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Categorized Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-success" />
              Contas a Receber (Período)
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
              Contas a Pagar (Período)
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
              Saldo Projetado (Final)
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
          <CardTitle>Projeção de Caixa</CardTitle>
          <CardDescription>
            Evolução do saldo acumulado no período selecionado.
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
                  tickFormatter={(value) =>
                    value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                  }
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: any) =>
                        Number(value).toLocaleString('pt-BR', {
                          maximumFractionDigits: 0,
                        })
                      }
                    />
                  }
                />
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                />
                <Bar
                  dataKey="balance"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <CashFlowGrid
        data={filteredEntries}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
    </div>
  )
}
