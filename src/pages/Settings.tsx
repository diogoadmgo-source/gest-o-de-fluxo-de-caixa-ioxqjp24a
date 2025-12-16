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

export default function Settings() {
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
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seus dados cadastrais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" defaultValue="João Silva" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue="joao.silva@hospcom.com.br" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Cargo</Label>
                <Input id="role" defaultValue="Gerente Financeiro" disabled />
              </div>
              <Button>Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Segurança da Conta</CardTitle>
              <CardDescription>
                Gerencie senha e autenticação de dois fatores.
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
                <Switch />
              </div>
              <Button variant="outline">Alterar Senha</Button>
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
