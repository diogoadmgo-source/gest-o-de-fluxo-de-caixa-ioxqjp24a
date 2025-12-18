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
import {
  Save,
  AlertCircle,
  RefreshCw,
  Trash2,
  Edit2,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { upsertBankBalance, deleteBankBalance } from '@/services/financial'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface BankBalanceManagerProps {
  selectedDate: Date
}

export function BankBalanceManager({ selectedDate }: BankBalanceManagerProps) {
  const {
    banks,
    selectedCompanyId,
    bankBalances,
    recalculateCashFlow,
    loading: storeLoading,
  } = useCashFlowStore()

  const [selectedBankId, setSelectedBankId] = useState('')
  const [amount, setAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Filter banks for the current company selection
  const relevantBanks = selectedCompanyId
    ? banks.filter((b) => b.company_id === selectedCompanyId && b.active)
    : []

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const isGlobalView = !selectedCompanyId || selectedCompanyId === 'all'

  // Load existing balance from store state instead of fetching individually
  // This prevents the "disappearing" effect by using the synced store data
  useEffect(() => {
    if (selectedBankId && dateStr) {
      const existingBalance = bankBalances.find(
        (b) => b.bank_id === selectedBankId && b.date === dateStr,
      )
      if (existingBalance) {
        setAmount(existingBalance.balance.toString())
      } else {
        setAmount('')
      }
    } else {
      setAmount('')
    }
  }, [selectedBankId, dateStr, bankBalances])

  // Reset selected bank if company context changes heavily
  useEffect(() => {
    if (selectedBankId && selectedCompanyId && selectedCompanyId !== 'all') {
      const bank = banks.find((b) => b.id === selectedBankId)
      if (bank && bank.company_id !== selectedCompanyId) {
        setSelectedBankId('')
      }
    }
  }, [selectedCompanyId, banks, selectedBankId])

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

    setIsSaving(true)
    try {
      await upsertBankBalance({
        company_id: selectedCompanyId!,
        bank_id: selectedBankId,
        reference_date: dateStr,
        amount: val,
      })

      toast.success('Saldo gravado com sucesso!')

      // Trigger update of global store
      recalculateCashFlow()

      // We do NOT clear the input here or refetch individually.
      // The store update will propagate and the useEffect above will verify/update the value if needed.
      // Optimistically the value is already correct in the input.
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar saldo.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este saldo?')) return
    setIsDeleting(id)

    try {
      await deleteBankBalance(id)
      toast.success('Saldo removido com sucesso.')
      recalculateCashFlow()

      // If deleting current selection, clear input
      const deletedBalance = bankBalances.find((b) => b.id === id)
      if (
        deletedBalance &&
        deletedBalance.bank_id === selectedBankId &&
        deletedBalance.date === dateStr
      ) {
        setAmount('')
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover saldo.')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleEdit = (bankId: string) => {
    setSelectedBankId(bankId)
    // The useEffect will populate the amount
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
                disabled={isGlobalView || isSaving}
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
                  disabled={!selectedBankId || isSaving}
                />
              </div>
            </div>

            <div className="md:col-span-1">
              <Button
                onClick={handleSave}
                className="w-full"
                disabled={isGlobalView || !selectedBankId || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? 'Salvando...' : 'Gravar Saldo'}
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
                      {storeLoading ? (
                        <div className="flex justify-center items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />{' '}
                          Carregando...
                        </div>
                      ) : (
                        'Nenhum saldo registrado para esta data.'
                      )}
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
                            disabled={isSaving || isDeleting === balance.id}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/90"
                            onClick={() => handleDelete(balance.id)}
                            disabled={isSaving || isDeleting === balance.id}
                          >
                            {isDeleting === balance.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
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
