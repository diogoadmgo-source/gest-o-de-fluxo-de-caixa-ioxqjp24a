import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KPI } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Info,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

interface KPIPanelProps {
  kpi: KPI
  previousKpi?: KPI
}

export function KPIPanel({ kpi, previousKpi }: KPIPanelProps) {
  // Gap calculation logic:
  // PMR (Recebimento) < PMP (Pagamento) = Good (Negative Gap is Good usually means we hold cash)
  // But strictly: Cash Gap = PMR - PMP.
  // If PMR (60) > PMP (30), Gap is +30. We fund 30 days. Bad.
  // If PMR (30) < PMP (60), Gap is -30. We are funded. Good.
  const isGapGood = kpi.cash_gap <= 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* PMR Card */}
      <Card className="hover:shadow-md transition-all border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            PMR (Recebimento)
          </CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Prazo Médio de Recebimento (dias)</TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(kpi.pmr)} dias</div>
          <p className="text-xs text-muted-foreground mt-1">
            Tempo médio para receber
          </p>
        </CardContent>
      </Card>

      {/* PMP Card */}
      <Card className="hover:shadow-md transition-all border-l-4 border-l-indigo-500">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            PMP (Pagamento)
          </CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Prazo Médio de Pagamento (dias)</TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(kpi.pmp)} dias</div>
          <p className="text-xs text-muted-foreground mt-1">
            Tempo médio para pagar
          </p>
        </CardContent>
      </Card>

      {/* Cash Gap Card */}
      <Card
        className={cn(
          'hover:shadow-md transition-all border-l-4',
          isGapGood ? 'border-l-emerald-500' : 'border-l-rose-500',
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ciclo Financeiro (GAP)
          </CardTitle>
          {isGapGood ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'text-2xl font-bold',
              isGapGood ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            {Math.round(kpi.cash_gap)} dias
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={isGapGood ? 'secondary' : 'destructive'}
              className="text-[10px] h-5"
            >
              {isGapGood ? 'Saudável' : 'Atenção'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {isGapGood ? 'Financiado' : 'Necessidade de Capital'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Runway / Cash Zero Card */}
      <Card
        className={cn(
          'hover:shadow-md transition-all border-l-4',
          kpi.days_until_zero > 30
            ? 'border-l-emerald-500'
            : kpi.days_until_zero > 15
              ? 'border-l-amber-500'
              : 'border-l-rose-500',
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Runway (Caixa)
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {kpi.days_until_zero >= 999
              ? 'Estável'
              : `${Math.round(kpi.days_until_zero)} dias`}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {kpi.days_until_zero < 15 && (
              <AlertTriangle className="h-3 w-3 text-rose-500" />
            )}
            <p className="text-xs text-muted-foreground">
              Duração estimada do saldo atual
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
