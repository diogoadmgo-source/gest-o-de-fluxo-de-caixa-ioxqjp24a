import { useState, useEffect } from 'react'
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
  isSameDay,
} from 'date-fns'
import {
  RefreshCcw,
  Download,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  CalendarIcon,
  Landmark,
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

const STORAGE_KEYS = {
  DATE_RANGE: 'hospcash_view_dateRange',
  SELECTED_DATE: 'hospcash_view_selectedDate',
}

export default function CashFlow() {
  const {
    cashFlowEntries,
    recalculateCashFlow,
    receivables,
    payables,
    accountPayables,
    adjustments,
  } = useCashFlowStore()
  const [loading, setLoading] = useState(false)

  // Initialize selectedDate from localStorage or default to today
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_DATE)
    return stored ? parseISO(stored) : new Date()
  })

  // Initialize dateRange from localStorage or default to today + 30 days
  const [dateRange, setDateRange] = useState<{
    from: Date
    to: Date
  }>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DATE_RANGE)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return {
          from: parseISO(parsed.from),
          to: parseISO(parsed.to),
        }
      } catch (e) {
        // Fallback if error parsing
      }
    }
    return {
      from: new Date(),
      to: addDays(new Date(), 30),
    }
  })

  // Persist view state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_DATE, selectedDate.toISOString())
  }, [selectedDate])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.DATE_RANGE,
      JSON.stringify({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      }),
    )
  }, [dateRange])

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      recalculateCashFlow()
      setLoading(false)
      toast.success('Fluxo recalculado com sucesso!')
    }, 800)
  }

  const handleExport = () => {
    if (!filteredEntries || filteredEntries.length === 0) {
      toast.error('Não há dados para exportar.')
      return
    }

    const headers = [
      'Data',
      'Saldo Inicial',
      'Entradas',
      'Saídas',
      'Saldo do Dia',
      'Saldo Acumulado',
    ]

    const csvContent = [headers.join(';')]

    filteredEntries.forEach((e) => {
      const row = [
        format(parseISO(e.date), 'dd/MM/yyyy'),
        e.opening_balance.toFixed(2).replace('.', ','),
        e.total_receivables.toFixed(2).replace('.', ','),
        e.total_payables.toFixed(2).replace('.', ','),
        e.daily_balance.toFixed(2).replace('.', ','),
        e.accumulated_balance.toFixed(2).replace('.', ','),
      ]
      csvContent.push(row.join(';'))
    })

    const blob = new Blob([csvContent.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `fluxo_caixa_${format(new Date(), 'dd-MM-yyyy')}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  // Daily Calculations for Cards based on selectedDate
  const dailyReceivables = receivables
    .filter((r) => r.due_date && isSameDay(parseISO(r.due_date), selectedDate))
    .reduce((sum, r) => sum + (r.updated_value || r.principal_value || 0), 0)

  const dailyPayablesTransactions = payables
    .filter(
      (p) =>
        p.due_date &&
        isSameDay(parseISO(p.due_date), selectedDate) &&
        p.status !== 'cancelled',
    )
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const dailyAccountPayables = accountPayables
    .filter((p) => p.due_date && isSameDay(parseISO(p.due_date), selectedDate))
    .reduce((sum, p) => sum + (p.principal_value || 0), 0)

  const totalDailyPayables = dailyPayablesTransactions + dailyAccountPayables

  // Adjustments
  const dailyAdjustments = adjustments.filter(
    (a) => isSameDay(parseISO(a.date), selectedDate) && a.status === 'approved',
  )
  const adjustmentsNet = dailyAdjustments.reduce(
    (sum, a) => sum + (a.type === 'credit' ? a.amount : -a.amount),
    0,
  )

  const dailyBalance = dailyReceivables - totalDailyPayables + adjustmentsNet

  // Find the calculated entry for selected date to display aggregated Accumulated Balance
  const selectedEntry = cashFlowEntries.find((e) =>
    isSameDay(parseISO(e.date), selectedDate),
  )

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
          <Button onClick={handleExport}>
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

      {/* Categorized Dashboard - Daily Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-success" />A Receber (Daily)
            </CardTitle>
            <CardDescription>
              {format(selectedDate, 'dd/MM/yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {dailyReceivables.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-destructive" />A Pagar (Daily)
            </CardTitle>
            <CardDescription>
              {format(selectedDate, 'dd/MM/yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {totalDailyPayables.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            'border-l-4',
            dailyBalance >= 0 ? 'border-l-primary' : 'border-l-destructive',
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp
                className={cn(
                  'h-4 w-4',
                  dailyBalance >= 0 ? 'text-primary' : 'text-destructive',
                )}
              />
              Saldo do Dia
            </CardTitle>
            <CardDescription>
              {format(selectedDate, 'dd/MM/yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                dailyBalance >= 0 ? 'text-primary' : 'text-destructive',
              )}
            >
              {dailyBalance.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Landmark className="h-4 w-4 text-blue-500" />
              Saldo Projetado
            </CardTitle>
            <CardDescription>
              {format(selectedDate, 'dd/MM/yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {selectedEntry
                ? selectedEntry.accumulated_balance.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })
                : '---'}
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
