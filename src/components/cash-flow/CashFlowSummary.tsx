import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CashFlowEntry } from '@/lib/types'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CashFlowSummaryProps {
  entries: CashFlowEntry[]
  loading?: boolean
}

export function CashFlowSummary({
  entries,
  loading = false,
}: CashFlowSummaryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-16 bg-muted/20" />
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    )
  }

  // Calculate totals from the filtered entries
  const totalInflows = entries.reduce((acc, e) => acc + e.total_receivables, 0)

  // Total Outflows includes Payables, Imports, Customs
  const totalOutflows = entries.reduce(
    (acc, e) => acc + e.total_payables + e.import_payments + e.customs_cost,
    0,
  )

  // Balances
  // Initial balance is the opening balance of the FIRST visible entry
  const initialBalance = entries.length > 0 ? entries[0].opening_balance : 0

  // Final balance is the accumulated balance of the LAST visible entry
  const finalBalance =
    entries.length > 0 ? entries[entries.length - 1].accumulated_balance : 0

  const netResult = finalBalance - initialBalance
  const isPositive = netResult >= 0

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Inicial (Período)
          </CardTitle>
          <Wallet className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(initialBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Base para projeção
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Entradas Previstas
          </CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totalInflows)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total de Recebíveis
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saídas Previstas
          </CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(totalOutflows)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pagamentos + Importações
          </p>
        </CardContent>
      </Card>

      <Card
        className={cn(
          'border-l-4 shadow-sm hover:shadow-md transition-shadow',
          isPositive ? 'border-l-emerald-600' : 'border-l-red-600',
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo Final Projetado
          </CardTitle>
          <TrendingUp
            className={cn(
              'h-4 w-4',
              isPositive ? 'text-emerald-600' : 'text-red-600',
            )}
          />
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'text-2xl font-bold',
              isPositive ? 'text-emerald-700' : 'text-red-700',
            )}
          >
            {formatCurrency(finalBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isPositive ? 'Superávit no período' : 'Déficit no período'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
