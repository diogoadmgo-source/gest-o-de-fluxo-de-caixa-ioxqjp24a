import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

export function AdjustmentList() {
  const { adjustments } = useCashFlowStore()

  // Sort by date descending
  const sortedAdjustments = [...adjustments].sort(
    (a, b) =>
      new Date(b.created_at || b.date).getTime() -
      new Date(a.created_at || a.date).getTime(),
  )

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <Card className="h-full border-l-4 border-l-muted">
      <CardHeader>
        <CardTitle>Últimos Ajustes</CardTitle>
        <CardDescription>Histórico de solicitações.</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedAdjustments.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 flex flex-col items-center">
            <p>Nenhum ajuste recente encontrado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAdjustments.map((adj) => (
              <div
                key={adj.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {adj.type === 'credit' ? (
                    <ArrowUpCircle className="h-5 w-5 text-success mt-0.5" />
                  ) : (
                    <ArrowDownCircle className="h-5 w-5 text-destructive mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {adj.type === 'credit' ? 'Crédito' : 'Débito'} -{' '}
                      {format(parseISO(adj.date), 'dd/MM/yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {adj.reason}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold text-sm ${
                      adj.type === 'credit'
                        ? 'text-success'
                        : 'text-destructive'
                    }`}
                  >
                    {adj.type === 'credit' ? '+' : '-'}{' '}
                    {formatCurrency(adj.amount)}
                  </p>
                  <Badge
                    variant={
                      adj.status === 'approved'
                        ? 'default'
                        : adj.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className={`text-[10px] mt-1 ${
                      adj.status === 'approved'
                        ? 'bg-success hover:bg-success/80'
                        : ''
                    }`}
                  >
                    {adj.status === 'approved'
                      ? 'Aprovado'
                      : adj.status === 'rejected'
                        ? 'Rejeitado'
                        : 'Pendente'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
