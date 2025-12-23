import { useQuery } from '@/hooks/use-query'
import { getReceivablesDashboardStats } from '@/services/financial'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, AlertCircle, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface ReceivableStatsProps {
  companyId: string | null
  lastUpdate?: number
}

export function ReceivableStats({
  companyId,
  lastUpdate,
}: ReceivableStatsProps) {
  const { data: stats, isLoading } = useQuery(
    `receivables-stats-${companyId}-${lastUpdate || 0}`,
    () => {
      if (!companyId || companyId === 'all') return Promise.resolve(null)
      return getReceivablesDashboardStats(companyId)
    },
    {
      enabled: !!companyId && companyId !== 'all',
      staleTime: 60000,
      dependencies: [lastUpdate],
    },
  )

  if (!companyId || companyId === 'all') {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="col-span-4 bg-muted/20 border-dashed">
          <CardContent className="flex items-center justify-center py-6 text-muted-foreground">
            Selecione uma empresa para visualizar os indicadores.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-24" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Data comes from getReceivablesDashboardStats which uses get_dashboard_kpis RPC
  // Stats mapping:
  // total_open: A Vencer + Vencido (all Open)
  // total_overdue: Vencido
  // (Derived) A Vencer: total_open - total_overdue

  const pendingAmount = (stats?.total_open || 0) - (stats?.total_overdue || 0)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6 animate-fade-in">
      {/* Total (Current Balance) */}
      <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total em Aberto
          </CardTitle>
          <DollarSign className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stats?.total_open || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Saldo total de títulos em aberto
          </p>
        </CardContent>
      </Card>

      {/* A Vencer (Pending) */}
      <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            A Vencer
          </CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(pendingAmount)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Títulos a vencer (ou vencendo hoje)
          </p>
        </CardContent>
      </Card>

      {/* Vencido (Overdue) */}
      <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Vencidos
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(stats?.total_overdue || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Títulos com vencimento passado
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
