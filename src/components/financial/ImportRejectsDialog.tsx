import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useQuery } from '@/hooks/use-query'
import { fetchImportRejects } from '@/services/financial'
import { Loader2, AlertCircle } from 'lucide-react'

interface ImportRejectsDialogProps {
  batchId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportRejectsDialog({
  batchId,
  open,
  onOpenChange,
}: ImportRejectsDialogProps) {
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useQuery(
    `import-rejects-${batchId}-${page}`,
    () =>
      batchId
        ? fetchImportRejects(batchId, page, pageSize)
        : Promise.resolve({ data: [], count: 0 }),
    { enabled: !!batchId && open, staleTime: Infinity },
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Registros Rejeitados / Duplicados
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Linha</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Dados (Parcial)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !data || data.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.row_number}
                    </TableCell>
                    <TableCell className="text-destructive font-medium">
                      {translateReason(item.reason)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                      {JSON.stringify(item.raw_data)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center py-2">
          <div className="text-sm text-muted-foreground">
            Total: {data?.count || 0}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data || data.data.length < pageSize || isLoading}
            >
              Próxima
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function translateReason(reason: string) {
  switch (reason) {
    case 'invoice_number_vazio':
      return 'Nota Fiscal vazia'
    case 'customer_vazio':
      return 'Cliente vazio'
    case 'valor_invalido':
      return 'Valor inválido'
    case 'data_vencimento_invalida':
      return 'Data Vencimento inválida'
    case 'parcela_formato_invalido':
      return 'Parcela inválida'
    case 'duplicado_lote':
      return 'Duplicado (Mesmo Lote)'
    default:
      return reason
  }
}
