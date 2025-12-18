import { useState, useEffect, useMemo } from 'react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProjectionChart } from '@/components/dashboard/ProjectionChart'
import { KPIPanel } from '@/components/dashboard/KPIPanel'
import { AlertList } from '@/components/dashboard/AlertList'
import { Button } from '@/components/ui/button'
import { Download, RefreshCcw, Calendar as CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { DailyBalance, Alert, KPI, BankBalance } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  isSameDay,
  parseISO,
  differenceInDays,
  addDays,
  startOfDay,
  subDays,
  isValid,
} from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

export default function Dashboard() {
  const {
    cashFlowEntries,
    recalculateCashFlow,
    loading: storeLoading,
    receivables,
    payables,
    bankBalances,
    companies,
    selectedCompanyId,
  } = useCashFlowStore()

  const [data, setData] = useState<DailyBalance[]>([])
  const [timeframe, setTimeframe] = useState('30')
  const [kpis, setKpis] = useState<KPI>({
    pmr: 0,
    pmp: 0,
    cash_gap: 0,
    days_until_zero: 999,
  })
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isCalculated, setIsCalculated] = useState(false)

  // 1. Process Chart Data from Cash Flow Entries
  useEffect(() => {
    const days = parseInt(timeframe) || 30
    const today = startOfDay(new Date())

    // Map daily balances for chart
    const todayIndex = cashFlowEntries.findIndex((entry) =>
      isSameDay(parseISO(entry.date), today),
    )
    const startIndex = todayIndex >= 0 ? todayIndex : 0

    // Ensure we have data even if starting from index 0
    const mappedData = cashFlowEntries
      .slice(startIndex, startIndex + days)
      .map((entry) => ({
        date: entry.date,
        closing_balance: entry.accumulated_balance,
        is_projected: entry.is_projected || false,
        total_inflows:
          entry.total_receivables + (entry.adjustments_credit || 0),
        total_outflows:
          entry.total_payables +
          (entry.imports || 0) +
          (entry.other_expenses || 0) +
          (entry.adjustments_debit || 0),
        net_flow: entry.daily_balance,
      }))

    setData(mappedData)
  }, [cashFlowEntries, timeframe])

  // 2. Calculate Real-time KPIs & Alerts
  useEffect(() => {
    if (storeLoading) return

    const today = startOfDay(new Date())

    // --- PMR Calculation ---
    // Filter active/recent receivables
    const activeReceivables = receivables.filter((r) => {
      // Consider receivables from last 90 days or future
      const issue = r.issue_date ? parseISO(r.issue_date) : null
      return issue && issue > subDays(today, 180)
    })

    let totalDaysReceivable = 0
    let countReceivable = 0

    activeReceivables.forEach((r) => {
      if (r.issue_date && r.due_date) {
        const issue = parseISO(r.issue_date)
        const due = parseISO(r.due_date)
        if (isValid(issue) && isValid(due)) {
          totalDaysReceivable += Math.abs(differenceInDays(due, issue))
          countReceivable++
        }
      }
    })
    const pmr = countReceivable > 0 ? totalDaysReceivable / countReceivable : 30 // Default fallback

    // --- PMP Calculation ---
    const activePayables = payables.filter((p) => {
      const issue = p.issue_date ? parseISO(p.issue_date) : null
      return issue && issue > subDays(today, 180)
    })

    let totalDaysPayable = 0
    let countPayable = 0

    activePayables.forEach((p) => {
      if (p.issue_date && p.due_date) {
        const issue = parseISO(p.issue_date)
        const due = parseISO(p.due_date)
        if (isValid(issue) && isValid(due)) {
          totalDaysPayable += Math.abs(differenceInDays(due, issue))
          countPayable++
        }
      }
    })
    const pmp = countPayable > 0 ? totalDaysPayable / countPayable : 45 // Default fallback

    // --- Cash Gap ---
    const cashGap = pmr - pmp

    // --- Runway (Days until Cash Zero) ---
    // 1. Get Consolidated Current Balance
    const latestBalances = new Map<string, BankBalance>()
    bankBalances.forEach((b) => {
      const existing = latestBalances.get(b.bank_id)
      if (!existing || new Date(b.date) > new Date(existing.date)) {
        latestBalances.set(b.bank_id, b)
      }
    })

    // Filter by selectedCompany if needed (though bankBalances should already be filtered by store)
    let currentTotalBalance = 0
    latestBalances.forEach((b) => {
      if (
        !selectedCompanyId ||
        selectedCompanyId === 'all' ||
        b.company_id === selectedCompanyId
      ) {
        currentTotalBalance += b.balance
      }
    })

    // 2. Average Daily Outflow (Next 30 Days)
    const next30Days = addDays(today, 30)
    const upcomingPayables = payables.filter((p) => {
      if (!p.due_date) return false
      const due = parseISO(p.due_date)
      return due >= today && due <= next30Days
    })

    const totalOutflowNext30 = upcomingPayables.reduce(
      (acc, p) => acc + (p.amount || 0),
      0,
    )
    const avgDailyOutflow = totalOutflowNext30 / 30

    const runway =
      avgDailyOutflow > 0 ? currentTotalBalance / avgDailyOutflow : 999

    setKpis({
      pmr,
      pmp,
      cash_gap: cashGap,
      days_until_zero: runway,
    })

    // --- Generate Alerts ---
    const generatedAlerts: Alert[] = []

    // 1. Overdue Alert
    const overdueCount = receivables.filter((r) => {
      if (
        !r.due_date ||
        r.title_status === 'Liquidado' ||
        r.title_status === 'Cancelado'
      )
        return false
      const due = parseISO(r.due_date)
      return due < today
    }).length

    if (overdueCount > 0) {
      generatedAlerts.push({
        id: 'alert-overdue',
        type: 'receivable_overdue',
        severity: overdueCount > 10 ? 'high' : 'medium',
        message: `${overdueCount} títulos vencidos requerem atenção.`,
        date: new Date().toISOString(),
        amount: 0, // Placeholder or calculate total
      })
    }

    // 2. Cash Risk
    if (runway < 15) {
      generatedAlerts.push({
        id: 'alert-runway',
        type: 'funding',
        severity: 'high',
        message: `Risco de Caixa: Runway estimado de apenas ${Math.round(runway)} dias.`,
        date: new Date().toISOString(),
      })
    }

    // 3. Gap Warning
    if (cashGap > 15) {
      // Arbitrary threshold for warning
      generatedAlerts.push({
        id: 'alert-gap',
        type: 'gap_warning' as any, // Cast for custom type
        severity: 'medium',
        message: `Gap Financeiro elevado (${Math.round(cashGap)} dias). Negocie prazos com fornecedores.`,
        date: new Date().toISOString(),
      })
    }

    setAlerts(generatedAlerts)
    setIsCalculated(true)
  }, [receivables, payables, bankBalances, storeLoading, selectedCompanyId])

  const handleRefresh = () => {
    recalculateCashFlow()
    toast.info('Sincronizando dados...')
  }

  // Calculate Totals for Metric Cards
  const totalInflowsPeriod = data.reduce(
    (acc, curr) => acc + curr.total_inflows,
    0,
  )
  const totalOutflowsPeriod = data.reduce(
    (acc, curr) => acc + curr.total_outflows,
    0,
  )
  const currentBalance = data[0]?.closing_balance || 0 // Today's balance from projection
  const finalProjectedBalance = data[data.length - 1]?.closing_balance || 0

  // Trend Data for Sparklines
  const balanceTrend = data
    .slice(0, 7)
    .map((d) => ({ value: d.closing_balance }))

  if (storeLoading || !isCalculated) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Visão Geral</h2>
          <p className="text-muted-foreground">
            {selectedCompanyId
              ? `Indicadores para ${companies.find((c) => c.id === selectedCompanyId)?.name || 'Empresa Selecionada'}`
              : 'Indicadores consolidados de todas as empresas'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-[140px]">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="h-9">
                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Próx. 7 dias</SelectItem>
                <SelectItem value="15">Próx. 15 dias</SelectItem>
                <SelectItem value="30">Próx. 30 dias</SelectItem>
                <SelectItem value="60">Próx. 60 dias</SelectItem>
                <SelectItem value="90">Próx. 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={storeLoading}
            title="Recalcular"
          >
            <RefreshCcw
              className={`h-4 w-4 ${storeLoading ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button size="icon" variant="secondary" title="Exportar Relatório">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <KPIPanel kpi={kpis} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Saldo Atual Consolidado"
          value={currentBalance}
          trendData={balanceTrend}
          description="Posição atual de caixa"
          trend="neutral"
        />
        <MetricCard
          title="Entradas Previstas"
          value={totalInflowsPeriod}
          trendData={data.map((d) => ({ value: d.total_inflows }))}
          description={`Próximos ${timeframe} dias`}
          trend="up"
          trendLabel="Fluxo de entrada"
        />
        <MetricCard
          title="Saídas Previstas"
          value={totalOutflowsPeriod}
          trendData={data.map((d) => ({ value: d.total_outflows }))}
          description={`Próximos ${timeframe} dias`}
          trend="down"
          trendLabel="Fluxo de saída"
        />
        <MetricCard
          title="Saldo Final Projetado"
          value={finalProjectedBalance}
          previousValue={currentBalance}
          trendData={data.map((d) => ({ value: d.closing_balance }))}
          description="Previsão ao fim do período"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <ProjectionChart data={data} timeframe={parseInt(timeframe)} />
        <div className="lg:col-span-1 h-full min-h-[300px]">
          <AlertList alerts={alerts} />
        </div>
      </div>
    </div>
  )
}
