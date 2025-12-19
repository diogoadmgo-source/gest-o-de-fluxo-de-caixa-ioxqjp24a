import { useState } from 'react'
import { BankBalanceDashboard } from '@/components/cash-flow/BankBalanceDashboard'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { BalanceHistoryGrid } from '@/components/cash-flow/BalanceHistoryGrid'
import { BalanceFormDialog } from '@/components/cash-flow/BalanceFormDialog'

export default function Balances() {
  const { banks, bankBalances, selectedCompanyId, recalculateCashFlow } =
    useCashFlowStore()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleSuccess = () => {
    recalculateCashFlow()
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleDeleteSuccess = () => {
    recalculateCashFlow()
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Saldos Bancários</h2>
        <Button
          onClick={() => setIsDialogOpen(true)}
          disabled={!selectedCompanyId || selectedCompanyId === 'all'}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Lançamento
        </Button>
      </div>

      {!selectedCompanyId || selectedCompanyId === 'all' ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          <CardContent className="pt-6">
            Selecione uma empresa no topo da página para gerenciar e visualizar
            os saldos.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Dashboard Summary */}
          <BankBalanceDashboard banks={banks} balances={bankBalances} />

          <div className="space-y-4 pt-6">
            <h3 className="text-lg font-semibold">Histórico de Lançamentos</h3>
            <BalanceHistoryGrid
              companyId={selectedCompanyId}
              refreshTrigger={refreshTrigger}
              onDeleteSuccess={handleDeleteSuccess}
            />
          </div>

          <BalanceFormDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            banks={banks}
            companyId={selectedCompanyId}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </div>
  )
}
