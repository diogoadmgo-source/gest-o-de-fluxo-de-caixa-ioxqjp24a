import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { Bank } from '@/lib/types'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function BankListManager() {
  const { banks, addBank, updateBank, deleteBank } = useCashFlowStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Form State
  const [formData, setFormData] = useState<Partial<Bank>>({
    name: '',
    institution: '',
    agency: '',
    account_number: '',
    account_digit: '',
  })

  const resetForm = () => {
    setFormData({
      name: '',
      institution: '',
      agency: '',
      account_number: '',
      account_digit: '',
    })
    setEditingId(null)
    setIsAdding(false)
  }

  const handleEdit = (bank: Bank) => {
    setFormData(bank)
    setEditingId(bank.id)
    setIsAdding(false)
  }

  const handleSave = () => {
    if (
      !formData.name ||
      !formData.institution ||
      !formData.account_number ||
      !formData.agency
    ) {
      toast.error(
        'Preencha os campos obrigatórios (Nome, Instituição, Agência, Conta).',
      )
      return
    }

    if (editingId) {
      updateBank({ ...formData, id: editingId } as Bank)
      toast.success('Banco atualizado com sucesso!')
    } else {
      addBank({
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        active: true,
      } as Bank)
      toast.success('Novo banco cadastrado com sucesso!')
    }
    resetForm()
  }

  const handleDelete = (id: string) => {
    deleteBank(id)
    toast.success('Banco inativado com sucesso.')
  }

  return (
    <div className="space-y-4">
      {!isAdding && !editingId && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Novo Banco
          </Button>
        </div>
      )}

      {(isAdding || editingId) && (
        <div className="border rounded-lg p-4 bg-muted/20 space-y-4 animate-fade-in">
          <h4 className="font-semibold text-sm">
            {editingId ? 'Editar Banco' : 'Adicionar Novo Banco'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Instituição (Ex: Banco Itaú)</Label>
              <Input
                value={formData.institution}
                onChange={(e) =>
                  setFormData({ ...formData, institution: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nome de Exibição (Apelido)</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Itaú Principal"
              />
            </div>
            <div className="space-y-2">
              <Label>Agência</Label>
              <Input
                value={formData.agency}
                onChange={(e) =>
                  setFormData({ ...formData, agency: e.target.value })
                }
                placeholder="0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Conta / Dígito</Label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  value={formData.account_number}
                  onChange={(e) =>
                    setFormData({ ...formData, account_number: e.target.value })
                  }
                  placeholder="Ex: 12345"
                />
                <Input
                  className="w-16 text-center"
                  value={formData.account_digit}
                  maxLength={1}
                  onChange={(e) => {
                    const val = e.target.value
                      .replace(/[^0-9]/g, '')
                      .slice(0, 1)
                    setFormData({ ...formData, account_digit: val })
                  }}
                  placeholder="X"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead>Agência</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((bank) => (
              <TableRow
                key={bank.id}
                className={cn(!bank.active && 'opacity-50')}
              >
                <TableCell className="font-medium">{bank.name}</TableCell>
                <TableCell>{bank.institution}</TableCell>
                <TableCell>{bank.agency || '-'}</TableCell>
                <TableCell>
                  {bank.account_number}
                  {bank.account_digit ? `-${bank.account_digit}` : ''}
                </TableCell>
                <TableCell>
                  <Badge variant={bank.active ? 'default' : 'secondary'}>
                    {bank.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(bank)}
                      disabled={!bank.active}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {bank.active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                        onClick={() => handleDelete(bank.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
