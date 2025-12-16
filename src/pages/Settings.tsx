import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { Users as UsersIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Settings() {
  const { userProfile, updatePassword, refreshProfile } = useAuth()
  const [name, setName] = useState(userProfile?.name || '')
  const [newPassword, setNewPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateProfile = async () => {
    setIsUpdating(true)
    try {
      if (name !== userProfile?.name) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ name })
          .eq('id', userProfile?.id)

        if (error) throw error
        await refreshProfile()
        toast.success('Perfil atualizado com sucesso.')
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres.')
        } else {
          const { error } = await updatePassword(newPassword)
          if (error) throw error
          toast.success('Senha atualizada.')
          setNewPassword('')
        }
      }
    } catch (error) {
      toast.error('Erro ao atualizar perfil.')
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie sua conta e preferências do sistema.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="company">Empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize seus dados cadastrais.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={userProfile?.email} disabled />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado por aqui.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Perfil</Label>
                  <Input
                    id="role"
                    value={
                      userProfile?.profile === 'Administrator'
                        ? 'Administrador'
                        : 'Usuário'
                    }
                    disabled
                  />
                </div>

                <div className="pt-4">
                  <Label htmlFor="new-pass">Alterar Senha</Label>
                  <Input
                    id="new-pass"
                    type="password"
                    placeholder="Nova senha (deixe em branco para manter)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                  {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>

            {userProfile?.profile === 'Administrator' && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="h-5 w-5" />
                    Gestão de Usuários
                  </CardTitle>
                  <CardDescription>
                    Acesse o painel administrativo de usuários.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link to="/configuracoes/usuarios">Gerenciar Usuários</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Segurança da Conta</CardTitle>
              <CardDescription>
                Gerencie autenticação e sessões.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticação de Dois Fatores (2FA)</Label>
                  <p className="text-sm text-muted-foreground">
                    Aumente a segurança da sua conta.
                  </p>
                </div>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configurações globais da empresa (Apenas Admin).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
