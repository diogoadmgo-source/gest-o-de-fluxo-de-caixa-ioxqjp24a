import { Card, CardContent } from '@/components/ui/card'
import { KPI } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface KPIPanelProps {
  kpi: KPI
}

export function KPIPanel({ kpi }: KPIPanelProps) {
  return (
    <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-background to-secondary/30">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                PMR (dias)
              </span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Prazo Médio de Recebimento</TooltipContent>
              </Tooltip>
            </div>
            <div className="text-3xl font-bold text-foreground">{kpi.pmr}</div>
            <div className="text-xs text-muted-foreground">Target: 30</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                PMP (dias)
              </span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Prazo Médio de Pagamento</TooltipContent>
              </Tooltip>
            </div>
            <div className="text-3xl font-bold text-foreground">{kpi.pmp}</div>
            <div className="text-xs text-muted-foreground">Target: 45</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                Gap de Caixa
              </span>
            </div>
            <div
              className={cn(
                'text-3xl font-bold',
                kpi.cash_gap < 0 ? 'text-success' : 'text-destructive',
              )}
            >
              {kpi.cash_gap}
            </div>
            <div className="text-xs text-muted-foreground">Menor é melhor</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                Dias até Caixa Zero
              </span>
            </div>
            <div
              className={cn(
                'text-3xl font-bold',
                kpi.days_until_zero < 15
                  ? 'text-destructive'
                  : kpi.days_until_zero < 30
                    ? 'text-warning'
                    : 'text-success',
              )}
            >
              {kpi.days_until_zero}
            </div>
            <div className="text-xs text-muted-foreground">Projeção</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
