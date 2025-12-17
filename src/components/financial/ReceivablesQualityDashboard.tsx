import { useMemo, useState } from 'react'
import { Receivable } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  AlertCircle,
  FileWarning,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { parseISO, isValid } from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ReceivablesQualityDashboardProps {
  data: Receivable[]
}

export function ReceivablesQualityDashboard({
  data,
}: ReceivablesQualityDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const stats = useMemo(() => {
    let missingFieldsCount = 0
    let negativePrincipalCount = 0
    let updatedLessThanPrincipalCount = 0
    let dueDateBeforeIssueDateCount = 0
    let consistentCount = 0

    const companyMap = new Map<
      string,
      {
        count: number
        sumPrincipal: number
        sumFine: number
        sumInterest: number
        sumUpdated: number
      }
    >()

    data.forEach((item) => {
      let hasError = false

      // 1. Missing Fields
      if (
        !item.company_id ||
        !item.invoice_number ||
        !item.customer ||
        item.principal_value === undefined ||
        item.principal_value === null ||
        item.updated_value === undefined ||
        item.updated_value === null
      ) {
        missingFieldsCount++
        hasError = true
      }

      // 2. Negative Principal
      const principal = item.principal_value || 0
      const fine = item.fine || 0
      const interest = item.interest || 0
      const updated = item.updated_value || 0

      if (principal < 0) {
        negativePrincipalCount++
        hasError = true
      }

      // 3. Updated < Principal
      // We allow a small epsilon for floating point issues, but generally updated should be >= principal
      if (updated < principal - 0.01) {
        updatedLessThanPrincipalCount++
        hasError = true
      }

      // 4. Due Date < Issue Date
      if (item.due_date && item.issue_date) {
        const dDate = parseISO(item.due_date)
        const iDate = parseISO(item.issue_date)
        if (isValid(dDate) && isValid(iDate) && dDate < iDate) {
          dueDateBeforeIssueDateCount++
          hasError = true
        }
      }

      if (!hasError) {
        consistentCount++
      }

      // Company Grouping
      const companyName = item.company || 'Empresa Desconhecida'
      const current = companyMap.get(companyName) || {
        count: 0,
        sumPrincipal: 0,
        sumFine: 0,
        sumInterest: 0,
        sumUpdated: 0,
      }

      companyMap.set(companyName, {
        count: current.count + 1,
        sumPrincipal: current.sumPrincipal + principal,
        sumFine: current.sumFine + fine,
        sumInterest: current.sumInterest + interest,
        sumUpdated: current.sumUpdated + updated,
      })
    })

    return {
      missingFieldsCount,
      negativePrincipalCount,
      updatedLessThanPrincipalCount,
      dueDateBeforeIssueDateCount,
      consistentCount,
      companyStats: Array.from(companyMap.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      ),
    }
  }, [data])

  const totalAnomalies =
    stats.missingFieldsCount +
    stats.negativePrincipalCount +
    stats.updatedLessThanPrincipalCount +
    stats.dueDateBeforeIssueDateCount

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <Card className="border-l-4 border-l-blue-500 shadow-sm mb-6">
      <CardHeader className="py-4 px-6 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            Dashboard de Qualidade e Totais
          </CardTitle>
          <Badge
            variant={totalAnomalies > 0 ? 'destructive' : 'secondary'}
            className="ml-2"
          >
            {totalAnomalies > 0
              ? `${totalAnomalies} Anomalias Detectadas`
              : 'Dados Consistentes'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="px-6 pb-6 pt-0 animate-fade-in-down">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <FileWarning className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Campos Obrigatórios</span>
              </div>
              <p className="text-2xl font-bold">{stats.missingFieldsCount}</p>
              <p className="text-xs text-muted-foreground">Registros</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Valor Negativo</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.negativePrincipalCount}
              </p>
              <p className="text-xs text-muted-foreground">Principal &lt; 0</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Inconsistência Val.</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.updatedLessThanPrincipalCount}
              </p>
              <p className="text-xs text-muted-foreground">At. &lt; Princ.</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Inconsistência Data</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.dueDateBeforeIssueDateCount}
              </p>
              <p className="text-xs text-muted-foreground">Venc. &lt; Emis.</p>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-center">Linhas</TableHead>
                  <TableHead className="text-right">Soma Principal</TableHead>
                  <TableHead className="text-right">Soma Multa</TableHead>
                  <TableHead className="text-right">Soma Juros</TableHead>
                  <TableHead className="text-right font-bold">
                    Soma Atualizada
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.companyStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Nenhum dado para exibir
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.companyStats.map(([company, stat]) => (
                    <TableRow key={company}>
                      <TableCell className="font-medium">{company}</TableCell>
                      <TableCell className="text-center">
                        {stat.count}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(stat.sumPrincipal)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(stat.sumFine)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(stat.sumInterest)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(stat.sumUpdated)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {stats.companyStats.length > 0 && (
                  <TableRow className="bg-muted/20 font-bold border-t-2">
                    <TableCell>TOTAL GERAL</TableCell>
                    <TableCell className="text-center">
                      {stats.companyStats.reduce(
                        (acc, [, s]) => acc + s.count,
                        0,
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        stats.companyStats.reduce(
                          (acc, [, s]) => acc + s.sumPrincipal,
                          0,
                        ),
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        stats.companyStats.reduce(
                          (acc, [, s]) => acc + s.sumFine,
                          0,
                        ),
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        stats.companyStats.reduce(
                          (acc, [, s]) => acc + s.sumInterest,
                          0,
                        ),
                      )}
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      {formatCurrency(
                        stats.companyStats.reduce(
                          (acc, [, s]) => acc + s.sumUpdated,
                          0,
                        ),
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
