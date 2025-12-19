import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { KPIPanel } from '@/components/dashboard/KPIPanel'
import { CashFlowEvolutionChart } from '@/components/cash-flow/CashFlowEvolutionChart'
import { Loader2 } from 'lucide-react'

export default function Dashboard() {
  const { selectedCompanyId, cashFlowEntries, kpis, loading } =
    useCashFlowStore()

  if (loading && !kpis) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  // Fallback data
  const kpiData = useMemo(
    () => ({
      pmr: kpis?.pmr || 0,
      pmp: kpis?.pmp || 0,
      cash_gap: kpis?.cash_gap || 0,
      days_until_zero: kpis?.runway_days || 999,
      current_balance: kpis?.current_balance || 0,
      receivables_amount_open: kpis?.receivables_amount_open || 0,
      receivables_amount_overdue: kpis?.receivables_amount_overdue || 0,
      receivables_amount_received: kpis?.receivables_amount_received || 0,
      payables_amount_pending: kpis?.payables_amount_pending || 0,
    }),
    [kpis],
  )

  const showRecebido = kpiData.receivables_amount_received > 0

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h2>

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
              trendLabel="Próximos 30+ dias"
            />
            <MetricCard
              title="A Pagar"
              value={kpiData.payables_amount_pending}
              description="Compromissos Pendentes"
              trend="down"
              trendLabel="Total Aberto"
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
