import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BankBalanceManager } from '@/components/cash-flow/BankBalanceManager'
import { HistoricalBalanceList } from '@/components/cash-flow/HistoricalBalanceList'
import { Calendar } from '@/components/ui/calendar'
import { ptBR } from 'date-fns/locale'
import { isSameDay, parseISO, format } from 'date-fns'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'
import { BankBalance, HistoricalBalance } from '@/lib/types'
import { Settings2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { BankListManager } from '@/components/cash-flow/BankListManager'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function Balances() {
  const { bankBalances, updateBankBalances, resetBalanceHistory } =
    useCashFlowStore()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentBalances, setCurrentBalances] = useState<BankBalance[]>([])

  useEffect(() => {
    // Filter balances for the selected date
    const filtered = bankBalances.filter((b) =>
      isSameDay(parseISO(b.date), selectedDate),
    )
    setCurrentBalances(filtered)
  }, [selectedDate, bankBalances])

  // Derive history from bankBalances state
  const historyData: HistoricalBalance[] = useMemo(() => {
    const groupedByDate: { [date: string]: number } = {}

    bankBalances.forEach((b) => {
      if (!groupedByDate[b.date]) {
        groupedByDate[b.date] = 0
      }
      groupedByDate[b.date] += b.balance
    })

    return Object.entries(groupedByDate).map(([date, balance], index) => ({
      id: `HIST-${date}-${index}`,
      date: date,
      consolidated_balance: balance,
      user_name: 'Usuário Atual',
      timestamp: date, // Simplified timestamp
    }))
  }, [bankBalances])

  const handleSaveBalances = (newBalances: BankBalance[]) => {
    updateBankBalances(newBalances)
    toast.success('Saldos salvos e fluxo recalculado com sucesso!')
  }

  const handleResetHistory = () => {
    resetBalanceHistory()
    toast.success('Histórico de saldos apagado com sucesso.')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Gestão de Saldos
          </h2>
          <p className="text-muted-foreground">
            Defina os saldos iniciais de contas bancárias para alimentar o fluxo
            de caixa.
          </p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Histórico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar todo o histórico?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. Todos os lançamentos de saldos
                  passados serão removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetHistory}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Confirmar Exclusão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Settings2 className="mr-2 h-4 w-4" />
                Gerenciar Bancos
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Gerenciar Contas Bancárias</DialogTitle>
                <DialogDescription>
                  Adicione, edite ou exclua contas bancárias do sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <BankListManager />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data de Referência</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                locale={ptBR}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <HistoricalBalanceList
            history={historyData}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        <div className="lg:col-span-3">
          <BankBalanceManager
            selectedDate={selectedDate}
            initialBalances={currentBalances}
            onSave={handleSaveBalances}
          />
        </div>
      </div>
    </div>
  )
}
