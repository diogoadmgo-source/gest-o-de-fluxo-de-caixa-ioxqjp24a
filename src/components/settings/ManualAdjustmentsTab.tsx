import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ManualAdjustmentsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Ajustes Manuais</h3>
        <p className="text-sm text-muted-foreground">
          Correções e lançamentos extraordinários.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Novo Ajuste</CardTitle>
            <CardDescription>Registre um ajuste no fluxo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Ajuste</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entrada Extraordinária</SelectItem>
                  <SelectItem value="exit">Saída Extraordinária</SelectItem>
                  <SelectItem value="correction">Correção de Saldo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input type="number" placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea placeholder="Descreva o motivo do ajuste..." />
            </div>
            <Button className="w-full">Solicitar Aprovação</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos Ajustes</CardTitle>
            <CardDescription>Histórico de solicitações.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              Nenhum ajuste recente encontrado.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
