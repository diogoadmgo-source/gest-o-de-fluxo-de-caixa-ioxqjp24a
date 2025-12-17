import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bank, BankBalance } from '@/lib/types'
import { Landmark, Wallet, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BankBalanceDashboardProps {
  banks: Bank[]
  balances: BankBalance[]
}

export function BankBalanceDashboard({
  banks,
  balances,
}: BankBalanceDashboardProps) {
  const activeBanks = banks.filter((b) => b.active)

  // Calculate distinct totals
  const totalBankBalance = activeBanks
    .filter((b) => b.type === 'bank')
    .reduce((sum, bank) => {
      const bankBalance = balances.find((b) => b.bank_id === bank.id)
      return sum + (bankBalance?.balance || 0)
    }, 0)

  const totalCashBalance = activeBanks
    .filter((b) => b.type === 'cash')
    .reduce((sum, bank) => {
      const bankBalance = balances.find((b) => b.bank_id === bank.id)
      return sum + (bankBalance?.balance || 0)
    }, 0)

  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Bank Balance Card */}
      <Card className="bg-primary text-primary-foreground shadow-md col-span-1 border-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary-foreground/90">
            Saldo Bancário Total
          </CardTitle>
          <Landmark className="h-4 w-4 text-primary-foreground/90" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalBankBalance)}
          </div>
          <p className="text-xs text-primary-foreground/80 mt-1">
            Contas Bancárias
          </p>
        </CardContent>
      </Card>

      {/* Cash Balance Card */}
      <Card className="bg-emerald-600 text-white shadow-md col-span-1 border-emerald-600">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white/90">
            Saldo de Caixa
          </CardTitle>
          <Banknote className="h-4 w-4 text-white/90" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalCashBalance)}
          </div>
          <p className="text-xs text-white/80 mt-1">Caixa Físico</p>
        </CardContent>
      </Card>

      {/* Individual Bank/Cash Cards */}
      {activeBanks.map((bank) => {
        const bankBalance = balances.find((b) => b.bank_id === bank.id)
        const currentAmount = bankBalance ? bankBalance.balance : 0
        const hasBalance = !!bankBalance

        return (
          <Card
            key={bank.id}
            className={cn(
              'transition-all hover:shadow-md border-l-4',
              hasBalance
                ? bank.type === 'cash'
                  ? 'border-l-emerald-500'
                  : 'border-l-primary'
                : 'border-l-muted opacity-80 bg-muted/20',
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className="text-sm font-medium truncate pr-2"
                title={bank.name}
              >
                {bank.name}
              </CardTitle>
              {bank.type === 'cash' ? (
                <Banknote className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Wallet className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(currentAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {bank.institution}{' '}
                {bank.account_number && bank.account_number !== '-'
                  ? `• ${bank.account_number}`
                  : ''}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
