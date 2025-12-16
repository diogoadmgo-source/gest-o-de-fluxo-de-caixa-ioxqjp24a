import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Filter,
  ShieldAlert,
  Archive,
  RotateCcw,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { UserProfile } from '@/lib/types'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Users() {
  const { userProfile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [profileFilter, setProfileFilter] = useState<string>('all')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  // Invite Form
  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    profile: 'User',
  })
  const [isInviting, setIsInviting] = useState(false)

  // Edit Form
  const [editData, setEditData] = useState({
    name: '',
    profile: 'User',
    status: 'Active',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data as UserProfile[])
    } catch (error) {
      toast.error('Erro ao carregar usuários.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    const matchesProfile =
      profileFilter === 'all' || user.profile === profileFilter
    return matchesSearch && matchesStatus && matchesProfile
  })

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsInviting(true)
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'invite',
          email: inviteData.email,
          name: inviteData.name,
          profile: inviteData.profile,
          company_id: userProfile?.company_id,
          redirectTo: `${window.location.origin}/reset-password`,
        },
      })

      if (error) throw error

      toast.success(`Convite enviado para ${inviteData.email}`)
      setIsInviteOpen(false)
      setInviteData({ name: '', email: '', profile: 'User' })
      fetchUsers()
    } catch (error: any) {
      toast.error(
        'Erro ao convidar usuário: ' + (error.message || 'Erro desconhecido'),
      )
    } finally {
      setIsInviting(false)
    }
  }

  const handleEdit = (user: UserProfile) => {
    setSelectedUser(user)
    setEditData({ name: user.name, profile: user.profile, status: user.status })
    setIsEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return
    setIsSaving(true)

    try {
      // Check for profile change
      if (editData.profile !== selectedUser.profile) {
        if (
          !confirm(
            'Alterar o perfil do usuário pode conceder ou revogar acessos administrativos. Deseja continuar?',
          )
        ) {
          setIsSaving(false)
          return
        }
      }

      // Check for status change logic handled in edge function
      let updateStatus = false
      if (editData.status !== selectedUser.status) {
        const { error: statusError } = await supabase.functions.invoke(
          'manage-users',
          {
            body: {
              action: 'update_status',
              id: selectedUser.id,
              status: editData.status,
            },
          },
        )
        if (statusError) throw statusError
        updateStatus = true
      }

      // Update basic info
      if (
        editData.name !== selectedUser.name ||
        editData.profile !== selectedUser.profile
      ) {
        const { error: profileError } = await supabase.functions.invoke(
          'manage-users',
          {
            body: {
              action: 'update_profile',
              id: selectedUser.id,
              name: editData.name,
              profile: editData.profile,
            },
          },
        )
        if (profileError) throw profileError
      }

      toast.success('Usuário atualizado com sucesso.')
      setIsEditOpen(false)
      fetchUsers()
    } catch (error: any) {
      toast.error('Erro ao atualizar usuário.')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPassword = async (user: UserProfile) => {
    if (
      !confirm(
        `Deseja enviar um email de redefinição de senha para ${user.email}? Esta ação desconectará o usuário de todas as sessões.`,
      )
    )
      return

    try {
      const { error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'reset_password',
          id: user.id,
          email: user.email,
          redirectTo: `${window.location.origin}/reset-password`,
        },
      })

      if (error) throw error
      toast.success('Email de redefinição enviado.')
    } catch (error) {
      toast.error('Erro ao solicitar redefinição.')
      console.error(error)
    }
  }

  const handleArchive = async (user: UserProfile) => {
    if (
      !confirm(
        `Deseja arquivar (inativar) o usuário ${user.name}? Ele não poderá mais fazer login.`,
      )
    )
      return

    try {
      const { error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update_status',
          id: user.id,
          status: 'Inactive',
        },
      })
      if (error) throw error
      toast.success('Usuário arquivado com sucesso.')
      fetchUsers()
    } catch (error) {
      toast.error('Erro ao arquivar usuário.')
    }
  }

  if (userProfile?.profile !== 'Administrator') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Acesso Negado</h2>
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Gestão de Usuários
          </h2>
          <p className="text-muted-foreground">
            Administre contas, permissões e acessos.
          </p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usuários do Sistema</CardTitle>
            <div className="flex gap-2">
              <Select value={profileFilter} onValueChange={setProfileFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Perfis</SelectItem>
                  <SelectItem value="Administrator">Admin</SelectItem>
                  <SelectItem value="User">Usuário</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="Active">Ativo</SelectItem>
                  <SelectItem value="Pending">Pendente</SelectItem>
                  <SelectItem value="Inactive">Inativo</SelectItem>
                  <SelectItem value="Blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.profile === 'Administrator'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {user.profile === 'Administrator' ? 'Admin' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === 'Active'
                            ? 'default'
                            : user.status === 'Pending'
                              ? 'secondary'
                              : user.status === 'Blocked'
                                ? 'destructive'
                                : 'outline'
                        }
                        className={
                          user.status === 'Active'
                            ? 'bg-success hover:bg-success/80'
                            : ''
                        }
                      >
                        {user.status === 'Active'
                          ? 'Ativo'
                          : user.status === 'Pending'
                            ? 'Pendente'
                            : user.status === 'Blocked'
                              ? 'Bloqueado'
                              : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_access
                        ? format(parseISO(user.last_access), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(user.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleResetPassword(user)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" /> Resetar Senha
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status !== 'Inactive' && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleArchive(user)}
                            >
                              <Archive className="mr-2 h-4 w-4" /> Arquivar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá um e-mail para definir sua senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={inviteData.name}
                onChange={(e) =>
                  setInviteData({ ...inviteData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) =>
                  setInviteData({ ...inviteData, email: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={inviteData.profile}
                onValueChange={(val) =>
                  setInviteData({ ...inviteData, profile: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="User">Usuário</SelectItem>
                  <SelectItem value="Administrator">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting && (
                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enviar Convite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={editData.profile}
                onValueChange={(val) =>
                  setEditData({ ...editData, profile: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="User">Usuário</SelectItem>
                  <SelectItem value="Administrator">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editData.status}
                onValueChange={(val) =>
                  setEditData({ ...editData, status: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Ativo</SelectItem>
                  <SelectItem value="Inactive">Inativo (Arquivado)</SelectItem>
                  <SelectItem value="Blocked">Bloqueado</SelectItem>
                  <SelectItem value="Pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving && (
                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
