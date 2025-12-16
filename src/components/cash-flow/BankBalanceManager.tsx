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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Save, Edit2, X, Check } from 'lucide-react'
import { BankBalance } from '@/lib/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import useCashFlowStore from '@/stores/useCashFlowStore'

interface BankBalanceManagerProps {
  selectedDate: Date
  initialBalances: BankBalance[]
  onSave: (balances: BankBalance[]) => void
}

export function BankBalanceManager({
  selectedDate,
  initialBalances,
  onSave,
}: BankBalanceManagerProps) {
  const { banks } = useCashFlowStore()
  const activeBanks = banks.filter((b) => b.active)

  const [balances, setBalances] = useState<BankBalance[]>(initialBalances)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [selectedBankId, setSelectedBankId] = useState('')
  const [amount, setAmount] = useState('')

  // Sync state with props when initialBalances changes (e.g. date change or store update)
  useEffect(() => {
    setBalances(initialBalances)
    // Also reset form when date changes to avoid confusion
    resetForm()
  }, [initialBalances])

  const totalBalance = balances.reduce((acc, curr) => acc + curr.balance, 0)
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const resetForm = () => {
    setSelectedBankId('')
    setAmount('')
    setEditingId(null)
  }

  const handleEdit = (balance: BankBalance) => {
    // Try to find by ID first if available (though type might not have it strictly linked, we use bank_name/account logic)
    // Ideally we should store bank_id in BankBalance
    let bank = banks.find((b) => b.id === balance.bank_id)

    if (!bank) {
      bank = banks.find(
        (b) =>
          b.name === balance.bank_name &&
          b.account_number === balance.account_number,
      )
    }

    if (bank) setSelectedBankId(bank.id)
    setAmount(balance.balance.toString())
    setEditingId(balance.id)
  }

  const handleSaveEntry = () => {
    if (!selectedBankId || !amount) {
      toast.error('Selecione a conta/caixa e informe o valor')
      return
    }

    const val = parseFloat(amount)
    if (isNaN(val)) {
      toast.error('Valor inválido')
      return
    }

    const bank = banks.find((b) => b.id === selectedBankId)
    if (!bank) return

    if (editingId) {
      // Update existing
      setBalances((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? {
                ...b,
                bank_name: bank.name,
                bank_id: bank.id,
                account_number: bank.account_number,
                balance: val,
              }
            : b,
        ),
      )
      toast.success('Saldo atualizado na lista.')
    } else {
      // Check if bank already exists in the list to avoid duplicates
      const existingIndex = balances.findIndex(
        (b) =>
          b.bank_id === bank.id ||
          (b.bank_name === bank.name &&
            b.account_number === bank.account_number),
      )

      if (existingIndex >= 0) {
        // Update existing instead of creating duplicate
        setBalances((prev) => {
          const newArr = [...prev]
          newArr[existingIndex] = {
            ...newArr[existingIndex],
            balance: val,
            bank_name: bank.name,
            bank_id: bank.id,
            account_number: bank.account_number,
          }
          return newArr
        })
        toast.success('Saldo atualizado.')
      } else {
        // Create new
        const newEntry: BankBalance = {
          id: Math.random().toString(36).substr(2, 9),
          date: dateStr,
          bank_name: bank.name,
          bank_id: bank.id,
          account_number: bank.account_number,
          balance: val,
          status: 'draft',
        }
        setBalances((prev) => [...prev, newEntry])
        toast.success('Saldo adicionado à lista.')
      }
    }

    resetForm()
  }

  const handleDelete = (id: string) => {
    setBalances(balances.filter((b) => b.id !== id))
  }

  const handleSaveAll = () => {
    // Ensure all balances have the correct date (in case they were carried over somehow, though useEffect prevents this)
    const normalizedBalances = balances.map((b) => ({
      ...b,
      date: dateStr,
      status: 'saved' as const,
    }))
    onSave(normalizedBalances)
  }

  return (
    <Card className="h-full border-l-4 border-l-primary/50">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">
              Lançamento de Saldos Diários
            </CardTitle>
            <CardDescription>
              Referência: {format(selectedDate, 'dd/MM/yyyy')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveAll}>
              <Save className="mr-2 h-4 w-4" />
              Gravar Saldos
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-muted/30 p-4 rounded-lg">
          <div className="space-y-2 md:col-span-1">
            <Label>Conta / Caixa</Label>
            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {activeBanks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}{' '}
                    {bank.account_number !== '-'
                      ? `- ${bank.account_number}`
                      : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Saldo (R$)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-2 md:col-span-1">
            <Button
              onClick={handleSaveEntry}
              className="w-full"
              variant={editingId ? 'secondary' : 'default'}
            >
              {editingId ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Atualizar
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar
                </>
              )}
            </Button>
            {editingId && (
              <Button
                onClick={resetForm}
                variant="ghost"
                size="icon"
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco / Caixa</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    Nenhum saldo lançado para este dia.
                  </TableCell>
                </TableRow>
              ) : (
                balances.map((balance) => (
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
                          'text-xs px-2 py-1 rounded-full',
                          balance.status === 'saved'
                            ? 'bg-success/10 text-success'
                            : 'bg-yellow-500/10 text-yellow-500',
                        )}
                      >
                        {balance.status === 'saved' ? 'Gravado' : 'Rascunho'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(balance)}
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

        {/* Summary Footer */}
        <div className="flex justify-end items-center gap-4 pt-2 border-t">
          <span className="text-sm font-medium text-muted-foreground">
            Total Consolidado:
          </span>
          <span className="text-2xl font-bold text-primary">
            {totalBalance.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
