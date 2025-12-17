import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  is_2fa_enabled: z.boolean(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function ProfileSettings() {
  const { userProfile, updateProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userProfile?.name || '',
      is_2fa_enabled: userProfile?.is_2fa_enabled || false,
    },
  })

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true)
    await updateProfile(data)
    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu Perfil</CardTitle>
        <CardDescription>
          Gerencie suas informações pessoais e preferências.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormDescription>
                    Este é o nome que será exibido no sistema.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Email</FormLabel>
              <Input value={userProfile?.email || ''} disabled readOnly />
              <p className="text-[0.8rem] text-muted-foreground">
                O email não pode ser alterado diretamente. Contate o suporte
                para alterações de email.
              </p>
            </div>

            <FormField
              control={form.control}
              name="is_2fa_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Autenticação de Dois Fatores (2FA)
                    </FormLabel>
                    <FormDescription>
                      Adicione uma camada extra de segurança à sua conta.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
