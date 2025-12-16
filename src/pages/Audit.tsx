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
import { mockLogs } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'

export default function Audit() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Trilha de Auditoria
        </h2>
        <p className="text-muted-foreground">
          Registro completo de atividades do sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logs do Sistema</CardTitle>
          <CardDescription>
            Eventos registrados para compliance e segurança.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.timestamp}</TableCell>
                  <TableCell>{log.user_name}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entity_affected}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.result === 'success' ? 'default' : 'destructive'
                      }
                      className={log.result === 'success' ? 'bg-success' : ''}
                    >
                      {log.result === 'success' ? 'Sucesso' : 'Falha'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
