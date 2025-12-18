import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { SecuritySettings } from '@/components/settings/SecuritySettings'
import { useAuth } from '@/hooks/use-auth'
import { Link } from 'react-router-dom'
import { Users as UsersIcon, Shield, User, Activity } from 'lucide-react'

export default function Settings() {
  const { userProfile } = useAuth()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie seu perfil, segurança e preferências.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Segurança
          </TabsTrigger>
          {userProfile?.profile === 'Administrator' && (
            <>
              <TabsTrigger value="users" asChild>
                <Link to="/configuracoes/usuarios">
                  <UsersIcon className="mr-2 h-4 w-4" />
                  Usuários
                </Link>
              </TabsTrigger>
              <TabsTrigger value="performance" asChild>
                <Link to="/performance">
                  <Activity className="mr-2 h-4 w-4" />
                  Performance
                </Link>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
