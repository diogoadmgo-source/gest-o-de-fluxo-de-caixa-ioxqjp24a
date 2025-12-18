import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/lib/types'
import {
  AlertTriangle,
  Clock,
  AlertCircle,
  Bell,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

interface AlertListProps {
  alerts: Alert[]
}

export function AlertList({ alerts }: AlertListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'funding':
        return <AlertTriangle className="h-5 w-5" />
      case 'receivable_overdue':
        return <Clock className="h-5 w-5" />
      case 'payable_overdue':
        return <AlertCircle className="h-5 w-5" />
      case 'gap_warning':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400'
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-400'
      default:
        return 'text-muted-foreground bg-muted'
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alertas Operacionais
          </CardTitle>
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {alerts.length} ativos
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-[300px] px-4 pb-4">
          <div className="space-y-3 pt-1">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                <CheckCircleIcon className="h-8 w-8 mb-2 opacity-50" />
                <p>Nenhum alerta pendente</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-all hover:translate-x-1 cursor-default',
                    getColor(alert.severity),
                  )}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate pr-2">
                      {alert.message}
                    </h4>
                    <div className="flex justify-between items-center mt-1 text-xs opacity-90">
                      <span>
                        {new Date(alert.date).toLocaleDateString('pt-BR')}
                      </span>
                      {alert.amount && (
                        <span className="font-mono font-medium">
                          {Math.abs(alert.amount).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        {alerts.length > 0 && (
          <div className="p-4 border-t bg-muted/10">
            <Button variant="ghost" className="w-full text-xs h-8" asChild>
              <Link to="/auditoria">
                Ver histórico <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
