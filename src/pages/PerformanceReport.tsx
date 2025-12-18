import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function PerformanceReport() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('performance_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <h2 className="text-3xl font-bold">Relatório de Performance</h2>

      <Card>
        <CardHeader>
          <CardTitle>Últimos Registros (Server-Side Logs)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="text-right">Duração (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>{log.route}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell className="text-right font-mono">
                      {log.duration_ms?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
