import { useState } from 'react'
import { CashFlowGrid } from '@/components/cash-flow/CashFlowGrid'
import { CashFlowFilters } from '@/components/cash-flow/CashFlowFilters'
import { CashFlowEvolutionChart } from '@/components/cash-flow/CashFlowEvolutionChart'
import { CashFlowSummary } from '@/components/cash-flow/CashFlowSummary'
import { Button } from '@/components/ui/button'
import { RefreshCcw, FileDown } from 'lucide-react'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function CashFlow() {
  const { filteredEntries, recalculateCashFlow, loading, selectedCompanyId } =
    useCashFlowStore()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const handleExport = () => {
    // Basic CSV export
    try {
      if (filteredEntries.length === 0) {
        toast.info('Sem dados para exportar.')
        return
      }
      const headers = [
        'Data',
        'Saldo Inicial',
        'Entradas',
        'Saídas',
        'Pag. Importação',
        'Custo Aduaneiro',
        'Saldo Dia',
        'Saldo Final',
      ]
      const rows = filteredEntries.map((e) => [
        e.date,
        e.opening_balance.toFixed(2),
        e.total_receivables.toFixed(2),
        e.total_payables.toFixed(2),
        e.import_payments.toFixed(2),
        e.customs_cost.toFixed(2),
        e.daily_balance.toFixed(2),
        e.accumulated_balance.toFixed(2),
      ])

      const csvContent = [
        headers.join(';'),
        ...rows.map((r) => r.join(';')),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `fluxo_caixa_${format(new Date(), 'yyyyMMdd')}.csv`,
      )
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      toast.error('Erro ao exportar.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Fluxo de Caixa Projetado
          </h2>
          <p className="text-muted-foreground">
            Visão consolidada da liquidez futura.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredEntries.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button
            variant="default"
            onClick={() => recalculateCashFlow()}
            disabled={loading}
          >
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <CashFlowFilters />

      {!selectedCompanyId ? (
        <Card className="p-12 text-center border-dashed flex flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <RefreshCcw className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="max-w-md">
            <h3 className="font-semibold text-lg">Selecione uma Empresa</h3>
            <p className="text-muted-foreground mt-2">
              Para visualizar a projeção de fluxo de caixa, selecione uma
              empresa ou filial no filtro acima.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <CashFlowSummary entries={filteredEntries} loading={loading} />

          {filteredEntries.length === 0 && !loading ? (
            <Card className="p-12 text-center border-dashed">
              <p className="text-muted-foreground">
                Nenhum dado encontrado para o período selecionado.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              <CashFlowEvolutionChart data={filteredEntries} />

              <CashFlowGrid
                data={filteredEntries}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
