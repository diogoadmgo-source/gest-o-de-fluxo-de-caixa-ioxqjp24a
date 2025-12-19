import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bank } from '@/lib/types'
import { toast } from 'sonner'
import { upsertBankBalance, updateBankBalance } from '@/services/financial'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface BalanceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  banks: Bank[]
  companyId: string
  onSuccess: () => void
  initialData?: {
    id: string
    bank_id: string
    amount: number
    reference_date: string
  } | null
}

export function BalanceFormDialog({
  open,
  onOpenChange,
  banks,
  companyId,
  onSuccess,
  initialData,
}: BalanceFormDialogProps) {
  const [bankId, setBankId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  // Load initial data when editing
  useEffect(() => {
    if (open && initialData) {
      setBankId(initialData.bank_id)
      setAmount(String(initialData.amount))
      setDate(initialData.reference_date)
    } else if (open && !initialData) {
      // Reset defaults when opening in create mode
      setBankId('')
      setAmount('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bankId || !amount || !date) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount)) {
      toast.error('Valor inválido.')
      return
    }

    setLoading(true)
    try {
      if (initialData?.id) {
        // Edit Mode
        await updateBankBalance(initialData.id, {
          bank_id: bankId,
          reference_date: date,
          amount: numAmount,
        })
        toast.success('Lançamento atualizado com sucesso!')
      } else {
        // Create Mode
        await upsertBankBalance({
          company_id: companyId,
          bank_id: bankId,
          reference_date: date,
          amount: numAmount,
        })
        toast.success('Lançamento realizado com sucesso!')
      }

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter banks for current company
  const activeBanks = banks.filter(
    (b) => b.company_id === companyId && b.active,
  )

  const isEdit = !!initialData?.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Lançamento' : 'Novo Lançamento de Saldo'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Atualize os dados do lançamento selecionado.'
              : 'Insira os dados do saldo bancário ou de caixa para a data selecionada.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bank">Conta / Caixa</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger id="bank">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {activeBanks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data de Referência</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Saldo (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
