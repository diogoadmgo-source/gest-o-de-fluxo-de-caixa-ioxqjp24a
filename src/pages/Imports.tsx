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
import { Badge } from '@/components/ui/badge'
import { format, parseISO } from 'date-fns'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { UploadCloud, CheckCircle, AlertCircle, FileText } from 'lucide-react'

export default function Imports() {
  const { importHistory, loading } = useCashFlowStore()

  const successCount = importHistory.filter(
    (l) => l.status === 'success',
  ).length
  const errorCount = importHistory.filter((l) => l.status === 'error').length
  const totalRecords = importHistory.reduce(
    (acc, curr) => acc + (curr.records_count || 0),
    0,
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Dashboard de Importações
        </h2>
        <p className="text-muted-foreground">
          Monitore o histórico e status das cargas de dados.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Importações
            </CardTitle>
            <UploadCloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{importHistory.length}</div>
            <p className="text-xs text-muted-foreground">
              Arquivos processados
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Registros Processados
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
            <p className="text-xs text-muted-foreground">
              Linhas importadas com sucesso
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Sucesso
            </CardTitle>
            {errorCount > 0 ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle className="h-4 w-4 text-success" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {importHistory.length > 0
                ? `${Math.round((successCount / importHistory.length) * 100)}%`
                : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              {errorCount} arquivos com erro
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico Recente</CardTitle>
          <CardDescription>
            Lista das últimas importações realizadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Data / Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Sucessos</TableHead>
                <TableHead className="text-center">Erros</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : importHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Nenhum histórico encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                importHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.filename}
                    </TableCell>
                    <TableCell>
                      {item.created_at
                        ? format(parseISO(item.created_at), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>{item.user_name}</TableCell>
                    <TableCell className="text-center">
                      {item.records_count}
                    </TableCell>
                    <TableCell className="text-center text-success">
                      {item.success_count}
                    </TableCell>
                    <TableCell className="text-center text-destructive">
                      {item.error_count}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          item.status === 'success' ? 'default' : 'destructive'
                        }
                        className={
                          item.status === 'success' ? 'bg-success' : ''
                        }
                      >
                        {item.status === 'success' ? 'Sucesso' : 'Erro'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
