import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { getDashboardKPIs } from '@/services/financial'
import { useQuery } from '@/hooks/use-query'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { KPIPanel } from '@/components/dashboard/KPIPanel'
import { Loader2 } from 'lucide-react'

export default function Dashboard() {
  const { selectedCompanyId } = useCashFlowStore()

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
              description="Calculado via RPC"
            />
            <MetricCard
              title="Saída Média Diária"
              value={kpis?.avg_daily_outflow || 0}
              trend="down"
            />
            <MetricCard
              title="Títulos Vencidos"
              value={kpis?.overdue_count || 0}
              isCurrency={false}
              description="Quantidade"
              trend="down"
            />
          </div>
        </>
      )}
    </div>
  )
}
