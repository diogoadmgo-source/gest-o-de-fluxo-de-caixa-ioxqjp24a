import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { getDashboardKPIs } from '@/services/financial'
import { useQuery } from '@/hooks/use-query'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { KPIPanel } from '@/components/dashboard/KPIPanel'
import { CashFlowEvolutionChart } from '@/components/cash-flow/CashFlowEvolutionChart'
import { Loader2 } from 'lucide-react'

export default function Dashboard() {
  const { selectedCompanyId, cashFlowEntries } = useCashFlowStore()

  const { data: kpis, isLoading } = useQuery(
    `dashboard-kpi-${selectedCompanyId}`,
    async () => {
      if (!selectedCompanyId || selectedCompanyId === 'all') return null
      return getDashboardKPIs(selectedCompanyId)
    },
    { enabled: !!selectedCompanyId && selectedCompanyId !== 'all' },
  )

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    )
  }

  // AC 4: Restored Charts & Corrected KPIs
  const kpiData = {
    pmr: kpis?.pmr || 30,
    pmp: kpis?.pmp || 45,
    cash_gap: kpis?.cash_gap || -15,
    days_until_zero: kpis?.runway_days || 999,
    current_balance: kpis?.current_balance || 0,
    receivables_amount_open: kpis?.receivables_amount_open || 0,
    receivables_amount_overdue: kpis?.receivables_amount_overdue || 0,
    receivables_amount_received: kpis?.receivables_amount_received || 0,
    payables_amount_pending: kpis?.payables_amount_pending || 0,
  }

  const showRecebido = kpiData.receivables_amount_received > 0

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h2>

      {!selectedCompanyId || selectedCompanyId === 'all' ? (
        <Card className="p-8 text-center text-muted-foreground">
          Selecione uma empresa para visualizar os indicadores otimizados.
        </Card>
      ) : (
        <>
          <KPIPanel kpi={kpiData} />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Saldo Atual"
              value={kpiData.current_balance}
              description="Posição de Caixa"
            />
            <MetricCard
              title="A Vencer"
              value={kpiData.receivables_amount_open}
              description="Recebíveis em Aberto"
              trend="neutral"
              trendLabel="Próximos fluxos"
            />
            <MetricCard
              title="Vencido"
              value={kpiData.receivables_amount_overdue}
              description="Em Atraso"
              trend="down"
              trendLabel="Atenção Necessária"
            />
            {showRecebido && (
              <MetricCard
                title="Recebido"
                value={kpiData.receivables_amount_received}
                description="Total Liquidado"
                trend="up"
                trendLabel="Entradas confirmadas"
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6">
            <CashFlowEvolutionChart data={cashFlowEntries} />
          </div>
        </>
      )}
    </div>
  )
}
