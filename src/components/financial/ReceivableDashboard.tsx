import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Receivable } from '@/lib/types'
import { DollarSign, Percent, AlertCircle, Calculator } from 'lucide-react'
import { parsePtBrFloat } from '@/lib/utils'

interface ReceivableDashboardProps {
  items: Receivable[]
}

export function ReceivableDashboard({ items }: ReceivableDashboardProps) {
  // Helper to safely parse numbers, using robust utility
  const toNumber = (value: any) => {
    if (value === null || value === undefined) return 0
    if (typeof value === 'number') return value
    return parsePtBrFloat(value)
  }

  const totals = items.reduce(
    (acc, item) => ({
      principal: acc.principal + toNumber(item.principal_value),
      fine: acc.fine + toNumber(item.fine),
      interest: acc.interest + toNumber(item.interest),
      updated:
        acc.updated + toNumber(item.updated_value || item.principal_value),
    }),
    { principal: 0, fine: 0, interest: 0, updated: 0 },
  )

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6 animate-fade-in">
      {/* Principal */}
      <Card className="shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Valor Principal
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totals.principal)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Soma do valor original (Visualização Atual)
          </p>
        </CardContent>
      </Card>

      {/* Multa */}
      <Card className="shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Multa
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(totals.fine)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Multas na visualização atual
          </p>
        </CardContent>
      </Card>

      {/* Juros */}
      <Card className="shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Juros
          </CardTitle>
          <Percent className="h-4 w-4 text-rose-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-600">
            {formatCurrency(totals.interest)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Juros na visualização atual
          </p>
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="shadow-sm border-l-4 border-l-primary hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Geral
          </CardTitle>
          <Calculator className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(totals.updated)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Valor atualizado consolidado (Visualização Atual)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
