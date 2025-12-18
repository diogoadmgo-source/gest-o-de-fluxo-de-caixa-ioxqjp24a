import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  const kpiData = {
    pmr: 30, // Need full RPC for complex calc or assume provided
    pmp: 45,
    cash_gap: -15,
    days_until_zero: kpis?.runway_days || 999,
  }

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Saldo Atual"
              value={kpis?.current_balance || 0}
              description="Posição de Caixa"
            />
            <MetricCard
              title="Total a Receber"
              value={kpis?.total_receivables || 0}
              description="Títulos em Aberto"
              trend="up"
            />
            <MetricCard
              title="Total a Pagar"
              value={kpis?.total_payables || 0}
              description="Obrigações Pendentes"
              trend="down"
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
