import { useState, useEffect } from 'react'
import {
  generateCashFlowData,
  mockBankBalances,
  mockHistoricalBalances,
} from '@/lib/mock-data'
import { CashFlowEntry, BankBalance } from '@/lib/types'
import { CashFlowGrid } from '@/components/cash-flow/CashFlowGrid'
import { CashFlowFilters } from '@/components/cash-flow/CashFlowFilters'
import { BankBalanceManager } from '@/components/cash-flow/BankBalanceManager'
import { HistoricalBalanceList } from '@/components/cash-flow/HistoricalBalanceList'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { RefreshCcw, AlertTriangle } from 'lucide-react'

export default function CashFlow() {
  const [data, setData] = useState<CashFlowEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [bankBalances, setBankBalances] =
    useState<BankBalance[]>(mockBankBalances)

  useEffect(() => {
    // Simulate API load
    setTimeout(() => {
      setData(generateCashFlowData(30))
      setLoading(false)
    }, 800)
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setData(generateCashFlowData(30))
      setLoading(false)
      toast.success('Fluxo recalculado com sucesso!')
    }, 800)
  }

  const handleSaveBankBalances = (newBalances: BankBalance[]) => {
    // In a real app, you would send this to the API
    setBankBalances(newBalances)

    // Recalculate the opening balance of the current day in the grid
    const totalBankBalance = newBalances.reduce(
      (acc, curr) => acc + curr.balance,
      0,
    )

    // Update grid data logic (simplified for frontend)
    const updatedData = [...data]
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const index = updatedData.findIndex((d) => d.date === dateStr)

    if (index !== -1) {
      updatedData[index].opening_balance = totalBankBalance
      // Recalculate subsequent days...
      // This logic is complex and usually done in backend, simulating simplified update:
      let accumulated =
        updatedData[index].opening_balance + updatedData[index].daily_balance
      updatedData[index].accumulated_balance = accumulated

      for (let i = index + 1; i < updatedData.length; i++) {
        updatedData[i].opening_balance = accumulated
        updatedData[i].daily_balance =
          updatedData[i].total_receivables -
          updatedData[i].total_payables -
          updatedData[i].imports -
          updatedData[i].other_expenses
        accumulated =
          updatedData[i].opening_balance + updatedData[i].daily_balance
        updatedData[i].accumulated_balance = accumulated
      }

      setData(updatedData)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Calculate totals for the bottom block
  const totalAvailable = bankBalances.reduce(
    (acc, curr) => acc + curr.balance,
    0,
  )
  const totalInvestment = 150000 // Mock value
  const totalGlobal = totalAvailable + totalInvestment

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Gestão de Saldo Diário
          </h2>
          <p className="text-muted-foreground">
            Acompanhamento diário, conciliação e projeção de caixa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reprocessar Período
          </Button>
          <Button variant="default">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Ajuste Manual
          </Button>
        </div>
      </div>

      <CashFlowFilters />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Sidebar: Historical */}
        <div className="xl:col-span-1">
          <HistoricalBalanceList
            history={mockHistoricalBalances}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          {/* Bank Balance Manager (Central Block) */}
          <div className="min-h-[300px]">
            <BankBalanceManager
              selectedDate={selectedDate}
              initialBalances={bankBalances}
              onSave={handleSaveBankBalances}
            />
          </div>

          {/* Consolidated Display (Bottom Block) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-success/5 border-success/20">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Saldo Disponível (Operacional)
                </span>
                <span className="text-2xl font-bold text-success">
                  {totalAvailable.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Saldo de Investimentos
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {totalInvestment.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Saldo Global Consolidado
                </span>
                <span className="text-2xl font-bold text-primary">
                  {totalGlobal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Main Grid */}
          <CashFlowGrid
            data={data}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      </div>
    </div>
  )
}
