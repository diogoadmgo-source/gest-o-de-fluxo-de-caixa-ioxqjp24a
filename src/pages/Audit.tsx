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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchAuditLogs, getDataIsolationStats } from '@/services/audit'
import { useQuery } from '@/hooks/use-query'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { format } from 'date-fns'
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'

export default function Audit() {
  const { selectedCompanyId, companies } = useCashFlowStore()
  const [page, setPage] = useState(1)
  const pageSize = 50

  const { data: logsData, isLoading: logsLoading } = useQuery(
    `audit-logs-${page}`,
    () => fetchAuditLogs(page, pageSize),
    { staleTime: 30000 },
  )

  const { data: isolationData, isLoading: isolationLoading } = useQuery(
    `isolation-stats-${selectedCompanyId}`,
    () => {
      if (!selectedCompanyId || selectedCompanyId === 'all')
        return Promise.resolve(null)
      return getDataIsolationStats(selectedCompanyId)
    },
    {
      enabled: !!selectedCompanyId && selectedCompanyId !== 'all',
      staleTime: 10000,
    },
  )

  const companyName =
    companies.find((c) => c.id === selectedCompanyId)?.name || 'Empresa'

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Trilha de Auditoria
        </h2>
        <p className="text-muted-foreground">
          Registro completo de atividades e verificação de integridade de dados.
        </p>
      </div>

      <Tabs defaultValue="system-logs">
        <TabsList>
          <TabsTrigger value="system-logs">Logs do Sistema</TabsTrigger>
          <TabsTrigger value="integrity">
            Verificação de Integridade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos do Sistema</CardTitle>
              <CardDescription>
                Ações de usuários e processos automáticos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData?.data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {format(
                            new Date(log.created_at),
                            'dd/MM/yyyy HH:mm:ss',
                          )}
                        </TableCell>
                        <TableCell>{log.entity}</TableCell>
                        <TableCell className="font-medium">
                          {log.action}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {JSON.stringify(log.details)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!logsData?.data || logsData.data.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground"
                        >
                          Nenhum log encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Auditoria de Isolamento de Dados
              </CardTitle>
              <CardDescription>
                Visualização dos lotes de importação ativos para {companyName}.
                Use para confirmar que não há resquícios de dados antigos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedCompanyId || selectedCompanyId === 'all' ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mb-2 opacity-50" />
                  <p>
                    Selecione uma empresa específica para realizar a verificação
                    de integridade.
                  </p>
                </div>
              ) : isolationLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">
                      Lotes de Recebíveis
                    </h3>
                    {isolationData?.receivables?.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhum dado encontrado.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {isolationData.receivables.map(
                          (batch: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 border rounded-lg bg-muted/10"
                            >
                              <div>
                                <div className="font-mono text-sm font-medium">
                                  {format(
                                    new Date(batch.batch_time),
                                    'dd/MM/yyyy HH:mm',
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Lote de Importação
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">{batch.count}</div>
                                <div className="text-xs text-muted-foreground">
                                  Registros
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                    {isolationData?.receivables?.length > 1 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>
                          Atenção: Existem múltiplos lotes de dados. Isso pode
                          indicar falha no processo de limpeza (Clean Slate) ou
                          inserções manuais misturadas com importações.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">
                      Lotes de Contas a Pagar
                    </h3>
                    {isolationData?.payables?.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhum dado encontrado.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {isolationData.payables.map((batch: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 border rounded-lg bg-muted/10"
                          >
                            <div>
                              <div className="font-mono text-sm font-medium">
                                {format(
                                  new Date(batch.batch_time),
                                  'dd/MM/yyyy HH:mm',
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Lote de Importação
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{batch.count}</div>
                              <div className="text-xs text-muted-foreground">
                                Registros
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isolationData?.payables?.length > 1 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>Atenção: Existem múltiplos lotes de dados.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
