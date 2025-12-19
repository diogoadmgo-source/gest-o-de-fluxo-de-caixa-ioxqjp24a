import { BankBalanceDashboard } from '@/components/cash-flow/BankBalanceDashboard'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { Card } from '@/components/ui/card'

export default function Balances() {
  const { banks, bankBalances, selectedCompanyId } = useCashFlowStore()

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold tracking-tight">Saldos Bancários</h2>

      {!selectedCompanyId ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          Selecione uma empresa para visualizar os saldos.
        </Card>
      ) : (
        <BankBalanceDashboard banks={banks} balances={bankBalances} />
      )}
    </div>
  )
}
