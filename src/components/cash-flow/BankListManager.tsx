import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { Bank } from '@/lib/types'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { getVisibleCompanyIds } from '@/services/financial'
import { useAuth } from '@/hooks/use-auth'

export function BankListManager() {
  const { addBank, updateBank, deleteBank, companies, selectedCompanyId } =
    useCashFlowStore()
  const { user } = useAuth()

  // Local state for all banks (including inactive ones)
  const [localBanks, setLocalBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isNewCompany, setIsNewCompany] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')

  // Form State
  const [formData, setFormData] = useState<Partial<Bank>>({
    name: '',
    code: '',
    institution: '',
    agency: '',
    account_number: '',
    account_digit: '',
    type: 'bank',
    company_id: selectedCompanyId || undefined,
  })

  useEffect(() => {
    fetchLocalBanks()
  }, [selectedCompanyId, user])

  const fetchLocalBanks = async () => {
    if (!user) return
    setLoading(true)
    try {
      const visibleIds = await getVisibleCompanyIds(
        supabase,
        user.id,
        selectedCompanyId,
      )

      if (visibleIds.length === 0) {
        setLocalBanks([])
        return
      }

      const { data } = await supabase
        .from('banks')
        .select('*')
        .in('company_id', visibleIds)
        .order('created_at', { ascending: false })

      if (data) {
        setLocalBanks(data as Bank[])
      }
    } catch (error) {
      console.error('Error fetching manage banks:', error)
      toast.error('Erro ao carregar lista de bancos')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      institution: '',
      agency: '',
      account_number: '',
      account_digit: '',
      type: 'bank',
      company_id: selectedCompanyId || undefined,
    })
    setEditingId(null)
    setIsAdding(false)
    setIsNewCompany(false)
    setNewCompanyName('')
  }

  const handleEdit = (bank: Bank) => {
    setFormData(bank)
    setEditingId(bank.id)
    setIsAdding(false)
    setIsNewCompany(false)
    setNewCompanyName('')
  }

  const handleSave = async () => {
    // Validation
    if (isNewCompany) {
      if (!newCompanyName.trim()) {
        toast.error('Informe o nome da nova empresa.')
        return
      }
    } else {
      if (!formData.company_id || formData.company_id === 'none') {
        toast.error('Selecione/Informe a empresa (Obrigatório)')
        return
      }
    }

    if (!formData.name?.trim()) {
      toast.error('O Nome de Exibição é obrigatório.')
      return
    }
    if (!formData.code?.trim()) {
      toast.error('O Código é obrigatório.')
      return
    }
    if (!formData.type) {
      toast.error('O Tipo de Conta é obrigatório.')
      return
    }

    if (formData.type === 'bank') {
      if (!formData.institution) {
        toast.error(
          'Instituição bancária é obrigatória para contas do tipo Banco.',
        )
        return
      }
      if (!formData.account_number) {
        toast.error('Número da conta é obrigatório.')
        return
      }
    }

    // Construct Payload
    const payload = {
      ...formData,
      company_name: isNewCompany ? newCompanyName : undefined,
    }

    if (editingId) {
      await updateBank({ ...payload, id: editingId } as Bank)
      toast.success('Conta atualizada com sucesso!')
    } else {
      const { error } = await addBank({
        ...payload,
        id: `temp-${Date.now()}`,
        active: true,
      } as Bank)

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe uma conta com este código para esta empresa.')
        } else {
          toast.error('Erro ao cadastrar banco: ' + error.message)
        }
        return // Do not reset or refresh if error
      } else {
        toast.success('Nova conta cadastrada com sucesso!')
      }
    }

    await fetchLocalBanks()
    resetForm()
  }

  const handleDelete = async (id: string) => {
    await deleteBank(id)
    toast.success('Conta inativada com sucesso.')
    await fetchLocalBanks()
  }

  return (
    <div className="space-y-4">
      {!isAdding && !editingId && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nova Conta/Caixa
          </Button>
        </div>
      )}

      {(isAdding || editingId) && (
        <div className="border rounded-lg p-4 bg-muted/20 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-sm">
              {editingId ? 'Editar Conta' : 'Adicionar Nova Conta'}
            </h4>
            {formData.type === 'cash' && (
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-600 border-emerald-200"
              >
                Caixa Físico
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Empresa <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col gap-2">
                {!isNewCompany ? (
                  <Select
                    value={formData.company_id || 'none'}
                    onValueChange={(val) => {
                      if (val === 'new') {
                        setIsNewCompany(true)
                        setFormData({ ...formData, company_id: undefined })
                      } else {
                        setFormData({
                          ...formData,
                          company_id: val === 'none' ? undefined : val,
                        })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione...</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="new"
                        className="text-primary font-medium border-t mt-1"
                      >
                        + Nova Empresa...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Nome da nova empresa"
                      className="border-primary"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setIsNewCompany(false)
                        setNewCompanyName('')
                      }}
                      title="Voltar para seleção"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {isNewCompany && (
                  <p className="text-xs text-muted-foreground">
                    Esta empresa será criada e vinculada ao seu usuário.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Conta</Label>
              <Select
                value={formData.type || 'bank'}
                onValueChange={(val: 'bank' | 'cash') =>
                  setFormData({ ...formData, type: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Conta Bancária</SelectItem>
                  <SelectItem value="cash">Caixa Físico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Nome de Exibição (Apelido){' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Itaú Principal"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Código (Identificador Único){' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="Ex: 341, CX-01"
              />
            </div>

            <div className="space-y-2">
              <Label>
                {formData.type === 'cash'
                  ? 'Local / Descrição'
                  : 'Instituição (Ex: Banco Itaú)'}
              </Label>
              <Input
                value={formData.institution}
                onChange={(e) =>
                  setFormData({ ...formData, institution: e.target.value })
                }
                placeholder={
                  formData.type === 'cash'
                    ? 'Ex: Cofre Loja 1'
                    : 'Ex: Banco Itaú'
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Agência</Label>
              <Input
                value={formData.agency}
                onChange={(e) =>
                  setFormData({ ...formData, agency: e.target.value })
                }
                placeholder={
                  formData.type === 'cash' ? "Use '-' se não houver" : '0000'
                }
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
                  placeholder={
                    formData.type === 'cash'
                      ? "Use '-' se não houver"
                      : 'Ex: 12345'
                  }
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
                  disabled={formData.type === 'cash'}
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
              <TableHead>Cód</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead>Agência</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  Carregando contas...
                </TableCell>
              </TableRow>
            ) : localBanks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-4 text-muted-foreground"
                >
                  Nenhuma conta encontrada.
                </TableCell>
              </TableRow>
            ) : (
              localBanks.map((bank) => {
                return (
                  <TableRow
                    key={bank.id}
                    className={cn(!bank.active && 'opacity-50')}
                  >
                    <TableCell className="text-xs font-mono font-medium">
                      {bank.code}
                    </TableCell>
                    <TableCell className="font-medium">{bank.name}</TableCell>
                    <TableCell>
                      {bank.type === 'cash' ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-600 bg-emerald-50 border-emerald-200"
                        >
                          Caixa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-blue-600 bg-blue-50 border-blue-200"
                        >
                          Banco
                        </Badge>
                      )}
                    </TableCell>
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
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
