import { useState, useEffect } from 'react'
import { generateCashFlowData } from '@/lib/mock-data'
import { CashFlowEntry } from '@/lib/types'
import { CashFlowGrid } from '@/components/cash-flow/CashFlowGrid'
import { InitialBalanceDialog } from '@/components/cash-flow/InitialBalanceDialog'
import { Button } from '@/components/ui/button'
import { CalendarIcon, Download, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { format, parseISO, isAfter, isSameDay } from 'date-fns'

export default function CashFlow() {
  const [data, setData] = useState<CashFlowEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false)
  const [selectedDateForBalance, setSelectedDateForBalance] = useState<
    Date | undefined
  >(undefined)

  useEffect(() => {
    // Simulate API load
    setTimeout(() => {
      setData(generateCashFlowData(30))
      setLoading(false)
    }, 800)
  }, [])

  const handleUpdateInitialBalance = (date: Date, amount: number) => {
    const dateStr = format(date, 'yyyy-MM-dd')

    // Find index of the date
    const index = data.findIndex((entry) =>
      isSameDay(parseISO(entry.date), date),
    )

    if (index === -1) {
      toast.error('Data fora do período de visualização.')
      return
    }

    const updatedData = [...data]

    // Update the opening balance for the target date
    updatedData[index].opening_balance = amount

    // Recalculate accumulated balance for this date
    updatedData[index].accumulated_balance =
      amount + updatedData[index].daily_balance

    // Propagate the change to all subsequent days
    for (let i = index + 1; i < updatedData.length; i++) {
      updatedData[i].opening_balance = updatedData[i - 1].accumulated_balance
      updatedData[i].accumulated_balance =
        updatedData[i].opening_balance + updatedData[i].daily_balance

      // Update alerts
      updatedData[i].has_alert = updatedData[i].accumulated_balance < 0
      updatedData[i].alert_message = updatedData[i].has_alert
        ? 'Saldo negativo projetado'
        : undefined
    }

    setData(updatedData)
    toast.success('Saldo inicial atualizado e fluxo recalculado com sucesso.')
  }

  const openBalanceDialog = (dateStr?: string) => {
    if (dateStr) {
      setSelectedDateForBalance(parseISO(dateStr))
    } else {
      setSelectedDateForBalance(new Date())
    }
    setIsBalanceDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const criticalCount = data.filter((d) => d.has_alert).length
  const minBalance = Math.min(...data.map((d) => d.accumulated_balance))
  const lowestDay = data.find((d) => d.accumulated_balance === minBalance)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Gestão de Fluxo de Caixa
          </h2>
          <p className="text-muted-foreground">
            Painel diário de movimentações financeiras e projeções.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openBalanceDialog()}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Ajustar Saldo
          </Button>
          <Button variant="default">
            <Download className="mr-2 h-4 w-4" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Mínimo Projetado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${minBalance < 0 ? 'text-destructive' : 'text-primary'}`}
            >
              {minBalance.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Previsão para{' '}
              {lowestDay ? format(parseISO(lowestDay.date), 'dd/MM/yyyy') : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dias com Alerta de Caixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${criticalCount > 0 ? 'text-destructive' : 'text-success'}`}
            >
              {criticalCount} dias
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {criticalCount > 0
                ? 'Necessita atenção imediata'
                : 'Fluxo estável no período'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recebimentos Previstos (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {data
                .reduce((acc, curr) => acc + curr.receivables, 0)
                .toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Média diária:{' '}
              {(
                data.reduce((acc, curr) => acc + curr.receivables, 0) /
                data.length
              ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>
      </div>

      <CashFlowGrid data={data} onEditInitialBalance={openBalanceDialog} />

      <InitialBalanceDialog
        open={isBalanceDialogOpen}
        onOpenChange={setIsBalanceDialogOpen}
        onSave={handleUpdateInitialBalance}
        defaultDate={selectedDateForBalance}
      />
    </div>
  )
}
