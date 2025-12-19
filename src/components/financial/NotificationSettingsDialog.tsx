import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '@/services/notifications'
import { Loader2 } from 'lucide-react'

interface NotificationSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
}

export function NotificationSettingsDialog({
  open,
  onOpenChange,
  companyId,
}: NotificationSettingsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [days, setDays] = useState(3)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [appEnabled, setAppEnabled] = useState(true)

  useEffect(() => {
    if (open && companyId && companyId !== 'all') {
      setLoading(true)
      getNotificationSettings(companyId)
        .then((settings) => {
          if (settings) {
            setDays(settings.days_before_due)
            setEmailEnabled(settings.email_enabled)
            setAppEnabled(settings.app_enabled)
          } else {
            // Defaults
            setDays(3)
            setEmailEnabled(true)
            setAppEnabled(true)
          }
        })
        .catch((err) => {
          console.error(err)
          toast.error('Erro ao carregar configurações')
        })
        .finally(() => setLoading(false))
    }
  }, [open, companyId])

  const handleSave = async () => {
    if (!companyId || companyId === 'all') return
    setSaving(true)
    try {
      await updateNotificationSettings(companyId, {
        days_before_due: days,
        email_enabled: emailEnabled,
        app_enabled: appEnabled,
      })
      toast.success('Configurações salvas!')
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alertas de Vencimento</DialogTitle>
          <DialogDescription>
            Configure como deseja ser notificado sobre contas a pagar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="days" className="col-span-2">
                Dias de antecedência
              </Label>
              <Input
                id="days"
                type="number"
                min={1}
                max={30}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="col-span-2"
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="email-notifications">
                  Notificações por Email
                </Label>
                <span className="text-xs text-muted-foreground">
                  Receba alertas diários no seu email.
                </span>
              </div>
              <Switch
                id="email-notifications"
                checked={emailEnabled}
                onCheckedChange={setEmailEnabled}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="app-notifications">Notificações no App</Label>
                <span className="text-xs text-muted-foreground">
                  Exibir alertas na central de notificações.
                </span>
              </div>
              <Switch
                id="app-notifications"
                checked={appEnabled}
                onCheckedChange={setAppEnabled}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? 'Salvando...' : 'Salvar Preferências'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
