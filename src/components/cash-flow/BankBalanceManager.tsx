import { useState } from 'react'
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
import { Plus, Trash2, Save, Lock } from 'lucide-react'
import { BankBalance } from '@/lib/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
  const [balances, setBalances] = useState<BankBalance[]>(initialBalances)
  const [newBank, setNewBank] = useState('')
  const [newAccount, setNewAccount] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const totalBalance = balances.reduce((acc, curr) => acc + curr.balance, 0)
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const handleAdd = () => {
    if (!newBank || !newAmount) {
      toast.error('Banco e Valor são obrigatórios')
      return
    }

    const amount = parseFloat(newAmount)
    if (isNaN(amount)) {
      toast.error('Valor inválido')
      return
    }

    const newEntry: BankBalance = {
      id: Math.random().toString(36).substr(2, 9),
      date: dateStr,
      bank_name: newBank,
      account_number: newAccount,
      balance: amount,
      status: 'draft',
    }

    setBalances([...balances, newEntry])
    setNewBank('')
    setNewAccount('')
    setNewAmount('')
  }

  const handleDelete = (id: string) => {
    // In a real app, logic for "soft delete" and audit log
    setBalances(balances.filter((b) => b.id !== id))
  }

  const handleSaveAll = () => {
    onSave(balances)
    toast.success('Saldos gravados com sucesso!')
  }

  return (
    <Card className="h-full border-l-4 border-l-primary/50">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">
              Gestão de Saldos Bancários
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/30 p-4 rounded-lg">
          <div className="space-y-2 md:col-span-1">
            <Label>Banco / Instituição</Label>
            <Select value={newBank} onValueChange={setNewBank}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Banco Itaú">Banco Itaú</SelectItem>
                <SelectItem value="Banco Santander">Banco Santander</SelectItem>
                <SelectItem value="Caixa Econômica">Caixa Econômica</SelectItem>
                <SelectItem value="Bradesco">Bradesco</SelectItem>
                <SelectItem value="Banco do Brasil">Banco do Brasil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Conta</Label>
            <Input
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
              placeholder="1234-5"
            />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Saldo Informado (R$)</Label>
            <Input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <Button onClick={handleAdd} className="md:col-span-1">
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>

        {/* Grid */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Saldo Informado</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
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
                    <TableCell>{balance.bank_name}</TableCell>
                    <TableCell>{balance.account_number || '-'}</TableCell>
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                        onClick={() => handleDelete(balance.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
