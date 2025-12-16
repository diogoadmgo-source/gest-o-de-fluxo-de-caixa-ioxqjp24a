import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/lib/types'
import { AlertTriangle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

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
      default:
        return <AlertCircle className="h-5 w-5" />
    }
  }

  const getColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-destructive bg-destructive/10 border-destructive/20'
      case 'medium':
        return 'text-warning bg-warning/10 border-warning/20'
      case 'low':
        return 'text-blue-500 bg-blue-50 border-blue-100'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Alertas e Notificações</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-6 pb-6">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-all hover:bg-muted/50 cursor-pointer',
                  getColor(alert.severity),
                )}
              >
                <div className="mt-0.5">{getIcon(alert.type)}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-foreground">
                    {alert.message}
                  </h4>
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>
                      {new Date(alert.date).toLocaleDateString('pt-BR')}
                    </span>
                    {alert.amount && (
                      <span className="font-medium">
                        {Math.abs(alert.amount).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
