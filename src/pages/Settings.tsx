import { useState, useEffect } from 'react'
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
import { Users as UsersIcon, Loader2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

export default function Settings() {
  const { userProfile, refreshProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const [name, setName] = useState(userProfile?.name || '')
  const [email, setEmail] = useState(userProfile?.email || '')
  const [newPassword, setNewPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name)
      setEmail(userProfile.email)
      setIs2FAEnabled(userProfile.is_2fa_enabled)
    }
  }, [userProfile])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleUpdateProfile = async () => {
    // Client-side Validation
    if (!name.trim()) {
      toast.error('O nome não pode estar vazio.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Formato de e-mail inválido.')
      return
    }

    if (newPassword && newPassword.length < 6) {
      toast.error('Senha não atende aos critérios mínimos (6 caracteres).')
      return
    }

    setIsUpdating(true)
    try {
      const { error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update_own_profile',
          name,
          email,
          password: newPassword || undefined,
        },
      })

      if (error) {
        // Parse error message for user friendliness
        let message = 'Erro ao atualizar perfil.'
        try {
          const errBody = JSON.parse(error.message || '{}')
          message = errBody.error || message
        } catch {
          if (error.message) message = error.message
        }

        // Handle common auth errors with custom messages as requested
        if (message.includes('already registered'))
          message = 'E-mail já cadastrado.'
        if (message.includes('Password should be'))
          message = 'Senha não atende aos critérios mínimos.'

        throw new Error(message)
      }

      toast.success('Perfil atualizado com sucesso!')
      if (newPassword) setNewPassword('')
      await refreshProfile()
    } catch (error: any) {
      console.error('Update profile error:', error)
      toast.error(error.message || 'Erro desconhecido ao atualizar perfil.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggle2FA = async (checked: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update_own_profile',
          is_2fa_enabled: checked,
        },
      })

      if (error) throw error

      setIs2FAEnabled(checked)
      toast.success(
        `Autenticação de dois fatores ${checked ? 'ativada' : 'desativada'}.`,
      )
      await refreshProfile()
    } catch (error) {
      toast.error('Erro ao atualizar configuração 2FA.')
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          {userProfile?.profile === 'Administrator' && (
            <TabsTrigger value="company">Empresa</TabsTrigger>
          )}
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
                  <Input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alterar o email enviará uma confirmação.
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
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
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
                    Aumente a segurança da sua conta. Será exigido no próximo
                    login.
                  </p>
                </div>
                <Switch
                  checked={is2FAEnabled}
                  onCheckedChange={handleToggle2FA}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {userProfile?.profile === 'Administrator' && (
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
        )}
      </Tabs>
    </div>
  )
}
