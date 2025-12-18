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
import { Plus, Trash2, Edit2, Check, X, RefreshCw } from 'lucide-react'
import { Bank } from '@/lib/types'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { getVisibleCompanyIds, upsertBankBalance } from '@/services/financial'
import { useAuth } from '@/hooks/use-auth'
import { format } from 'date-fns'

export function BankListManager() {
  const {
    addBank,
    updateBank,
    deleteBank,
    companies,
    selectedCompanyId,
    recalculateCashFlow,
  } = useCashFlowStore()
  const { user } = useAuth()

  // Local state for all banks (including inactive ones for management)
  const [localBanks, setLocalBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isNewCompany, setIsNewCompany] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [initialBalance, setInitialBalance] = useState('')

  // Form State
  const [formData, setFormData] = useState<Partial<Bank>>({
    name: '',
    code: '',
    institution: '',
    agency: '',
    account_number: '',
    account_digit: '',
    type: 'bank',
    company_id:
      selectedCompanyId && selectedCompanyId !== 'all'
        ? selectedCompanyId
        : undefined,
    active: true,
  })

  // Determine if company selection should be locked
  const lockedCompanyId =
    selectedCompanyId && selectedCompanyId !== 'all' ? selectedCompanyId : null

  useEffect(() => {
    fetchLocalBanks()
  }, [selectedCompanyId, user])

  // If locked company changes (e.g. user changes dropdown in header), reset form
  useEffect(() => {
    if (lockedCompanyId) {
      setFormData((prev) => ({ ...prev, company_id: lockedCompanyId }))
    }
  }, [lockedCompanyId])

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
      company_id: lockedCompanyId || undefined,
      active: true,
    })
    setEditingId(null)
    setIsAdding(false)
    setIsNewCompany(false)
    setNewCompanyName('')
    setInitialBalance('')
  }

  const handleEdit = (bank: Bank) => {
    setFormData(bank)
    setEditingId(bank.id)
    setIsAdding(false)
    setIsNewCompany(false)
    setNewCompanyName('')
    setInitialBalance('')
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

    // Type-specific validations
    if (formData.type === 'bank') {
      if (!formData.code?.trim()) {
        toast.error('O Código é obrigatório para contas bancárias.')
        return
      }
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

    // Prepare payload
    let finalCode = formData.code
    let finalAccount = formData.account_number

    // Auto-fill for Cash type
    if (formData.type === 'cash') {
      if (!finalCode?.trim()) {
        // Generate a simple unique code based on timestamp to satisfy unique constraint
        finalCode = `CX-${Date.now().toString().slice(-6)}`
      }
      if (!finalAccount?.trim()) {
        finalAccount = '-'
      }
    }

    // Construct Payload
    const payload = {
      ...formData,
      code: finalCode,
      account_number: finalAccount,
      company_name: isNewCompany ? newCompanyName : undefined,
    }

    try {
      if (editingId) {
        await updateBank({ ...payload, id: editingId } as Bank)
        toast.success('Conta atualizada com sucesso!')
      } else {
        const { data: createdBank, error } = await addBank({
          ...payload,
          id: `temp-${Date.now()}`,
          active: true,
        } as Bank)

        if (error) {
          if (error.code === '23505') {
            toast.error(
              'Já existe uma conta com este código para esta empresa.',
            )
          } else {
            toast.error('Erro ao cadastrar banco: ' + error.message)
          }
          return // Do not reset or refresh if error
        } else {
          toast.success('Nova conta cadastrada com sucesso!')

          // Handle Initial Balance
          if (createdBank && initialBalance) {
            const balanceVal = parseFloat(initialBalance)
            if (!isNaN(balanceVal) && balanceVal > 0) {
              try {
                await upsertBankBalance({
                  company_id: createdBank.company_id,
                  bank_id: createdBank.id,
                  reference_date: format(new Date(), 'yyyy-MM-dd'),
                  amount: balanceVal,
                })
                toast.success('Saldo inicial registrado!')
                recalculateCashFlow()
              } catch (balErr: any) {
                console.error('Failed to set initial balance', balErr)
                toast.warning(
                  'Conta criada, mas houve erro ao salvar o saldo inicial.',
                )
              }
            }
          }
        }
      }

      await fetchLocalBanks()
      resetForm()
    } catch (err) {
      console.error(err)
      toast.error('Ocorreu um erro ao salvar.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja inativar esta conta?')) return
    await deleteBank(id)
    toast.success('Conta inativada com sucesso.')
    await fetchLocalBanks()
  }

  return (
    <div className="space-y-4">
      {!isAdding && !editingId && (
        <div className="flex justify-between items-center bg-muted/10 p-2 rounded-lg border border-border/50">
          <p className="text-sm text-muted-foreground pl-2">
            {lockedCompanyId
              ? `Gerenciando contas para: ${companies.find((c) => c.id === lockedCompanyId)?.name || 'Empresa Selecionada'}`
              : 'Visualizando todas as empresas permitidas'}
          </p>
          <Button
            onClick={() => {
              resetForm()
              setIsAdding(true)
            }}
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Conta/Caixa
          </Button>
        </div>
      )}

      {(isAdding || editingId) && (
        <div className="border rounded-lg p-4 bg-muted/20 space-y-4 animate-fade-in relative">
          <div className="flex justify-between items-center border-b pb-2 mb-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              {editingId ? (
                <Edit2 className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingId ? 'Editar Conta' : 'Adicionar Nova Conta'}
            </h4>
            <div className="flex items-center gap-2">
              {formData.type === 'cash' && (
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-600 border-emerald-200"
                >
                  Caixa Físico
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={resetForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
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
                    disabled={false}
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
                      {!lockedCompanyId && (
                        <SelectItem
                          value="new"
                          className="text-primary font-medium border-t mt-1"
                        >
                          + Nova Empresa...
                        </SelectItem>
                      )}
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
                        setFormData({
                          ...formData,
                          company_id: lockedCompanyId || undefined,
                        })
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
                placeholder="Ex: Itaú Principal ou Cofre"
              />
            </div>

            {formData.type === 'bank' && (
              <div className="space-y-2">
                <Label>
                  Código (ID Único) <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Ex: 341, CX-01"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>
                {formData.type === 'cash'
                  ? 'Local / Descrição (Opcional)'
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

            {formData.type === 'bank' && (
              <>
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
                        setFormData({
                          ...formData,
                          account_number: e.target.value,
                        })
                      }
                      placeholder="Ex: 12345"
                    />
                    <Input
                      className="w-16 text-center"
                      value={formData.account_digit}
                      maxLength={2}
                      onChange={(e) => {
                        const val = e.target.value
                        setFormData({ ...formData, account_digit: val })
                      }}
                      placeholder="X"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Initial Balance Field - Only when adding new account */}
            {!editingId && (
              <div className="space-y-2">
                <Label className="text-primary font-semibold">
                  Saldo Inicial (R$)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0.00"
                  className="border-primary/50 bg-primary/5"
                />
                <p className="text-xs text-muted-foreground">
                  Se informado, cria um registro de saldo para hoje.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.active ? 'true' : 'false'}
                onValueChange={(val) =>
                  setFormData({ ...formData, active: val === 'true' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4 mt-2">
            <Button variant="outline" size="sm" onClick={resetForm}>
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
              <TableHead className="w-[80px]">Cód</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Instituição/Local</TableHead>
              <TableHead>Agência</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Carregando contas...
                  </div>
                </TableCell>
              </TableRow>
            ) : localBanks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhuma conta encontrada.
                </TableCell>
              </TableRow>
            ) : (
              localBanks.map((bank) => {
                return (
                  <TableRow
                    key={bank.id}
                    className={cn(!bank.active && 'opacity-50 bg-muted/30')}
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
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {bank.active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/90"
                            onClick={() => handleDelete(bank.id)}
                            title="Inativar"
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
