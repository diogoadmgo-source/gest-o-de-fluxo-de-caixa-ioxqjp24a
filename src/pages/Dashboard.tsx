import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { KPIPanel } from '@/components/dashboard/KPIPanel'
import { CashFlowEvolutionChart } from '@/components/cash-flow/CashFlowEvolutionChart'
import { Loader2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Dashboard() {
  const {
    selectedCompanyId,
    cashFlowEntries,
    kpis,
    loading,
    timeframe,
    setTimeframe,
  } = useCashFlowStore()

  // Always define hooks at top level
  const kpiData = useMemo(() => {
    // Return default/zero values if kpis is null/undefined
    if (!kpis) {
      return {
        pmr: 0,
        pmp: 0,
        cash_gap: 0,
        days_until_zero: 999,
        current_balance: 0,
        receivables_amount_open: 0,
        receivables_amount_overdue: 0,
        receivables_amount_received: 0,
        payables_amount_pending: 0,
      }
    }

    return {
      pmr: kpis.pmr || 0,
      pmp: kpis.pmp || 0,
      cash_gap: kpis.cash_gap || 0,
      days_until_zero: kpis.runway_days ?? 999, // Use nullish coalescing to safely handle 0
      current_balance: kpis.current_balance || 0,
      receivables_amount_open: kpis.receivables_amount_open || 0,
      receivables_amount_overdue: kpis.receivables_amount_overdue || 0,
      receivables_amount_received: kpis.receivables_amount_received || 0,
      payables_amount_pending: kpis.payables_amount_pending || 0,
    }
  }, [kpis])

  if (loading && !kpis) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">
          Dashboard Executivo
        </h2>
        <Tabs
          value={String(timeframe)}
          onValueChange={(val) => setTimeframe(Number(val))}
          className="w-full md:w-auto"
        >
          <TabsList className="grid w-full md:w-auto grid-cols-5">
            <TabsTrigger value="7">7 Dias</TabsTrigger>
            <TabsTrigger value="15">15 Dias</TabsTrigger>
            <TabsTrigger value="30">30 Dias</TabsTrigger>
            <TabsTrigger value="60">60 Dias</TabsTrigger>
            <TabsTrigger value="90">90 Dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!selectedCompanyId || selectedCompanyId === 'all' ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          Selecione uma empresa para visualizar os indicadores otimizados.
        </Card>
      ) : (
        <>
          <KPIPanel kpi={kpiData as any} />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Saldo Atual"
              value={kpiData.current_balance}
              description="Disponibilidade Total"
              trend="neutral"
            />
            <MetricCard
              title="A Vencer"
              value={kpiData.receivables_amount_open}
              description="Recebíveis Futuros"
              trend="up"
              trendLabel={`Próximos ${timeframe} dias`}
            />
            <MetricCard
              title="A Pagar"
              value={kpiData.payables_amount_pending}
              description="Compromissos Pendentes"
              trend="down"
              trendLabel={`Próximos ${timeframe} dias`}
            />
            <MetricCard
              title="Vencido (Receb.)"
              value={kpiData.receivables_amount_overdue}
              description="Em Atraso"
              trend="down"
              trendLabel="Atenção"
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <CashFlowEvolutionChart data={cashFlowEntries} />
          </div>
        </>
      )}
    </div>
  )
}
