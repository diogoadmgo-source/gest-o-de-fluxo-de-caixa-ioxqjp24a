import { useState, useEffect } from 'react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProjectionChart } from '@/components/dashboard/ProjectionChart'
import { KPIPanel } from '@/components/dashboard/KPIPanel'
import { AlertList } from '@/components/dashboard/AlertList'
import { mockKPIs, mockAlerts } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Download, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { DailyBalance } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Dashboard() {
  const { cashFlowEntries, recalculateCashFlow } = useCashFlowStore()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DailyBalance[]>([])
  const [timeframe, setTimeframe] = useState('30')

  useEffect(() => {
    // Map cash flow entries to daily balance format expected by dashboard components
    const days = parseInt(timeframe) || 30

    // Ensure we have enough data (generating more if needed would be better but simple slicing is ok for now as long as we have 90 generated)
    const mappedData = cashFlowEntries
      .map((entry) => ({
        date: entry.date,
        closing_balance: entry.accumulated_balance,
        is_projected: entry.is_projected || false,
        total_inflows: entry.total_receivables,
        total_outflows: entry.total_payables,
        net_flow: entry.daily_balance,
      }))
      .slice(0, days) // Slice based on selected timeframe
    setData(mappedData)
  }, [cashFlowEntries, timeframe])

  const handleRefresh = () => {
    setLoading(true)
    toast.info('Atualizando dados...')
    setTimeout(() => {
      recalculateCashFlow()
      setLoading(false)
      toast.success('Dados atualizados com sucesso!')
    }, 1000)
  }

  const currentBalance = data[0]?.closing_balance || 0
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
        <div className="flex gap-2 items-center">
          <div className="w-[180px]">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="21">21 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button size="icon">
            <Download className="h-4 w-4" />
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
          title="Entradas (Período)"
          value={data.reduce((acc, curr) => acc + curr.total_inflows, 0)}
          previousValue={12000}
          trendData={trendData}
        />
        <MetricCard
          title="Saídas (Período)"
          value={data.reduce((acc, curr) => acc + curr.total_outflows, 0)}
          previousValue={10000}
          trendData={trendData}
        />
        <MetricCard
          title="Saldo Projetado (Final)"
          value={data[data.length - 1]?.closing_balance || 0}
          previousValue={currentBalance}
          trendData={data.slice(-7).map((d) => ({ value: d.closing_balance }))}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ProjectionChart data={data} timeframe={parseInt(timeframe)} />
        <AlertList alerts={mockAlerts} />
      </div>

      <KPIPanel kpi={mockKPIs} />
    </div>
  )
}
