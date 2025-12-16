import { useState, useEffect } from 'react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProjectionChart } from '@/components/dashboard/ProjectionChart'
import { KPIPanel } from '@/components/dashboard/KPIPanel'
import { AlertList } from '@/components/dashboard/AlertList'
import { generateDailyBalances, mockKPIs, mockAlerts } from '@/lib/mock-data'
import { DailyBalance } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Download, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

export default function Dashboard() {
  const [data, setData] = useState<DailyBalance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setData(generateDailyBalances())
      setLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    toast.info('Atualizando dados...')
    setTimeout(() => {
      setData(generateDailyBalances())
      setLoading(false)
      toast.success('Dados atualizados com sucesso!')
    }, 1000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const currentBalance =
    data.find(
      (d) =>
        !d.is_projected && d.date === new Date().toISOString().split('T')[0],
    )?.closing_balance || data[7].closing_balance
  const prevBalance = 48000 // Mock previous
  const trendData = data.slice(0, 7).map((d) => ({ value: d.closing_balance }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Visão Geral</h2>
          <p className="text-muted-foreground">
            Acompanhe os principais indicadores financeiros da sua empresa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Saldo Atual"
          value={currentBalance}
          previousValue={prevBalance}
          trendData={trendData}
        />
        <MetricCard
          title="Entradas (7d)"
          value={data
            .slice(0, 7)
            .reduce((acc, curr) => acc + curr.total_inflows, 0)}
          previousValue={12000}
          trendData={trendData}
        />
        <MetricCard
          title="Saídas (7d)"
          value={data
            .slice(0, 7)
            .reduce((acc, curr) => acc + curr.total_outflows, 0)}
          previousValue={10000}
          trendData={trendData}
        />
        <MetricCard
          title="Saldo Projetado (30d)"
          value={data[data.length - 1].closing_balance}
          previousValue={currentBalance}
          trendData={data.slice(-7).map((d) => ({ value: d.closing_balance }))}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ProjectionChart data={data} />
        <AlertList alerts={mockAlerts} />
      </div>

      <KPIPanel kpi={mockKPIs} />
    </div>
  )
}
