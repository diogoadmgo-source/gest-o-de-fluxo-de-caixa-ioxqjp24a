import { useState } from 'react'
import { CashFlowGrid } from '@/components/cash-flow/CashFlowGrid'
import { CashFlowFilters } from '@/components/cash-flow/CashFlowFilters'
import { CashFlowEvolutionChart } from '@/components/cash-flow/CashFlowEvolutionChart'
import { Button } from '@/components/ui/button'
import { RefreshCcw } from 'lucide-react'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { addDays } from 'date-fns'
import { Card } from '@/components/ui/card'

export default function CashFlow() {
  const { cashFlowEntries, recalculateCashFlow, loading, selectedCompanyId } =
    useCashFlowStore()
  const [dateRange, setDateRange] = useState<any>({
    from: new Date(),
    to: addDays(new Date(), 30),
  })
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Filter entries based on range
  const filteredEntries = cashFlowEntries.filter((e) => {
    const d = new Date(e.date)
    return (
      (!dateRange?.from || d >= dateRange.from) &&
      (!dateRange?.to || d <= dateRange.to)
    )
  })

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h2>
          <p className="text-muted-foreground">Visão diária e projeções.</p>
        </div>
        <div className="flex gap-2 items-center">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => recalculateCashFlow()}
            disabled={loading}
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      <CashFlowFilters />

      {!selectedCompanyId ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          Selecione uma empresa para visualizar o fluxo de caixa.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6">
            <CashFlowEvolutionChart data={filteredEntries} />
          </div>

          <CashFlowGrid
            data={filteredEntries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </>
      )}
    </div>
  )
}
