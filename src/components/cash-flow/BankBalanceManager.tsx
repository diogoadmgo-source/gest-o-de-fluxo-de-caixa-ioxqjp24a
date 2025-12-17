import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Save, AlertCircle, RefreshCw, Trash2, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import useCashFlowStore from '@/stores/useCashFlowStore'
import {
  getBankBalance,
  upsertBankBalance,
  deleteBankBalance,
} from '@/services/financial'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface BankBalanceManagerProps {
  selectedDate: Date
}

export function BankBalanceManager({ selectedDate }: BankBalanceManagerProps) {
  const { banks, selectedCompanyId, bankBalances, recalculateCashFlow } =
    useCashFlowStore()

  const [selectedBankId, setSelectedBankId] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingBalance, setFetchingBalance] = useState(false)

  // Filter banks for the current company selection
  const relevantBanks = selectedCompanyId
    ? banks.filter((b) => b.company_id === selectedCompanyId && b.active)
    : []

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const isGlobalView = !selectedCompanyId || selectedCompanyId === 'all'

  // Reset form when context changes
  useEffect(() => {
    setSelectedBankId('')
    setAmount('')
  }, [selectedCompanyId, dateStr])

  // Fetch balance when bank and date are selected
  useEffect(() => {
    if (selectedBankId && selectedCompanyId && dateStr) {
      fetchExistingBalance(selectedCompanyId, selectedBankId, dateStr)
    }
  }, [selectedBankId, selectedCompanyId, dateStr])

  const fetchExistingBalance = async (
    companyId: string,
    bankId: string,
    date: string,
  ) => {
    setFetchingBalance(true)
    try {
      const val = await getBankBalance(companyId, bankId, date)
      setAmount(val.toString())
    } catch (error) {
      console.error('Failed to fetch balance', error)
      toast.error('Erro ao buscar saldo existente')
    } finally {
      setFetchingBalance(false)
    }
  }

  const handleSave = async () => {
    if (isGlobalView) {
      toast.error('Selecione uma empresa específica para salvar saldos.')
      return
    }

    if (!selectedBankId) {
      toast.error('Selecione uma conta bancária.')
      return
    }

    const val = parseFloat(amount)
    if (isNaN(val)) {
      toast.error('Valor inválido.')
      return
    }

    setLoading(true)
    try {
      await upsertBankBalance({
        company_id: selectedCompanyId!,
        bank_id: selectedBankId,
        reference_date: dateStr,
        amount: val,
      })

      toast.success('Saldo gravado com sucesso!')

      recalculateCashFlow()
      fetchExistingBalance(selectedCompanyId!, selectedBankId, dateStr)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar saldo.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este saldo?')) return

    try {
      await deleteBankBalance(id)
      toast.success('Saldo removido com sucesso.')
      recalculateCashFlow()
      if (selectedBankId) {
        // If the deleted bank is currently selected, refresh input to 0
        fetchExistingBalance(selectedCompanyId!, selectedBankId, dateStr)
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover saldo.')
    }
  }

  const handleEdit = (bankId: string) => {
    setSelectedBankId(bankId)
  }

  // Get current day's balances from store for display
  const todaysBalances = bankBalances.filter(
    (b) =>
      b.date === dateStr &&
      (selectedCompanyId ? b.company_id === selectedCompanyId : true),
  )

  const totalBalance = todaysBalances.reduce(
    (acc, curr) => acc + curr.balance,
    0,
  )

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-primary/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">
                Lançamento de Saldos Diários
              </CardTitle>
              <CardDescription>
                Referência: {format(selectedDate, 'dd/MM/yyyy')}
              </CardDescription>
            </div>
            {isGlobalView && (
              <Alert variant="destructive" className="max-w-md py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">
                  Ação Necessária
                </AlertTitle>
                <AlertDescription className="text-xs">
                  Selecione uma empresa específica no topo da página para lançar
                  saldos.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-muted/30 p-4 rounded-lg">
            <div className="space-y-2 md:col-span-1">
              <Label>Conta / Caixa</Label>
              <Select
                value={selectedBankId}
                onValueChange={setSelectedBankId}
                disabled={isGlobalView || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {relevantBanks.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {isGlobalView
                        ? 'Selecione uma empresa'
                        : 'Nenhuma conta ativa'}
                    </SelectItem>
                  ) : (
                    relevantBanks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name}
                        {bank.account_number && bank.account_number !== '-'
                          ? ` - ${bank.account_number}`
                          : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label>Saldo (R$)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={!selectedBankId || loading || fetchingBalance}
                  className={fetchingBalance ? 'opacity-50' : ''}
                />
                {fetchingBalance && (
                  <div className="absolute right-3 top-2.5">
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-1">
              <Button
                onClick={handleSave}
                className="w-full"
                disabled={
                  isGlobalView || !selectedBankId || loading || fetchingBalance
                }
              >
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Gravar Saldo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Saldos Registrados ({todaysBalances.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco / Caixa</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-center w-[100px]">
                    Status
                  </TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaysBalances.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-6"
                    >
                      Nenhum saldo registrado para esta data.
                    </TableCell>
                  </TableRow>
                ) : (
                  todaysBalances.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell className="font-medium">
                        {balance.bank_name}
                      </TableCell>
                      <TableCell>
                        {balance.account_number !== '-'
                          ? balance.account_number
                          : ''}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {balance.balance.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'text-xs px-2 py-1 rounded-full bg-success/10 text-success',
                          )}
                        >
                          Gravado
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(balance.bank_id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/90"
                            onClick={() => handleDelete(balance.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end items-center gap-4 pt-4">
            <span className="text-sm font-medium text-muted-foreground">
              Total Consolidado:
            </span>
            <span className="text-xl font-bold text-primary">
              {totalBalance.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
