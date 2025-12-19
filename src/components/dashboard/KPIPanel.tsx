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
}

export function KPIPanel({ kpi }: KPIPanelProps) {
  // Use fallbacks for safety
  const pmr = kpi?.pmr || 0
  const pmp = kpi?.pmp || 0
  const gap = kpi?.cash_gap || 0
  const runway = kpi?.days_until_zero || 999
  const isGapGood = gap <= 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="text-2xl font-bold">{Math.round(pmr)} dias</div>
        </CardContent>
      </Card>

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
          <div className="text-2xl font-bold">{Math.round(pmp)} dias</div>
        </CardContent>
      </Card>

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
            {Math.round(gap)} dias
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={isGapGood ? 'secondary' : 'destructive'}
              className="text-[10px] h-5"
            >
              {isGapGood ? 'Saudável' : 'Atenção'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          'hover:shadow-md transition-all border-l-4',
          runway > 30 ? 'border-l-emerald-500' : 'border-l-rose-500',
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
            {runway >= 999 ? 'Estável' : `${Math.round(runway)} dias`}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Duração estimada</p>
        </CardContent>
      </Card>
    </div>
  )
}
