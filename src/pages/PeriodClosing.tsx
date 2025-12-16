import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { useState } from 'react'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export default function PeriodClosing() {
  const [date, setDate] = useState<Date | undefined>(new Date())

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Fechamento de Período
        </h2>
        <p className="text-muted-foreground">
          Valide e encerre o fluxo de caixa diário e mensal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Seletor de Data</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={ptBR}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>
              Checklist de Fechamento - {date?.toLocaleDateString('pt-BR')}
            </CardTitle>
            <CardDescription>
              Verifique os itens pendentes para fechar o dia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-success/5 border-success/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium">Conciliação Bancária</span>
                </div>
                <span className="text-sm text-success font-semibold">OK</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-success/5 border-success/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium">Lançamentos de Recebíveis</span>
                </div>
                <span className="text-sm text-success font-semibold">OK</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5 border-destructive/20">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="font-medium">Aprovação de Pagamentos</span>
                </div>
                <Button size="sm" variant="destructive">
                  Resolver
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Saldo Calculado
                </p>
                <p className="text-2xl font-bold">R$ 45.230,00</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground text-right">
                  Saldo Real
                </p>
                <p className="text-2xl font-bold text-right">R$ 45.230,00</p>
              </div>
            </div>

            <Button className="w-full" disabled>
              Fechar Período (Pendências)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
