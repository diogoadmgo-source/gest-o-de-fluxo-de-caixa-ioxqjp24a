import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { fetchBalanceHistory, deleteBankBalance } from '@/services/financial'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { Trash2, Loader2, Calendar, Wallet, Edit2 } from 'lucide-react'
import { PaginationControl } from '@/components/common/PaginationControl'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { DateRange } from 'react-day-picker'
import { BalanceFormDialog } from '@/components/cash-flow/BalanceFormDialog'
import useCashFlowStore from '@/stores/useCashFlowStore'

interface BalanceHistoryGridProps {
  companyId: string | null
  refreshTrigger: number
  onDeleteSuccess: () => void
}

export function BalanceHistoryGrid({
  companyId,
  refreshTrigger,
  onDeleteSuccess,
}: BalanceHistoryGridProps) {
  const { banks } = useCashFlowStore()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [totalCount, setTotalCount] = useState(0)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Actions state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingBalance, setEditingBalance] = useState<any | null>(null)

  const loadData = async () => {
    if (!companyId || companyId === 'all') {
      setData([])
      setTotalCount(0)
      return
    }

    setLoading(true)
    try {
      const filters = {
        startDate: dateRange?.from
          ? format(dateRange.from, 'yyyy-MM-dd')
          : undefined,
        endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      }

      const { data: history, count } = await fetchBalanceHistory(
        companyId,
        page,
        pageSize,
        filters,
      )
      setData(history || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar histórico de saldos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [companyId, page, pageSize, refreshTrigger, dateRange])

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await deleteBankBalance(deleteId)
      toast.success('Registro removido com sucesso.')
      setDeleteId(null)
      loadData()
      onDeleteSuccess()
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSuccess = () => {
    setEditingBalance(null)
    loadData()
    onDeleteSuccess() // Triggers recalculation in parent
  }

  if (!companyId || companyId === 'all') {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
          <Wallet className="h-12 w-12 mb-4 opacity-50" />
          <p>Selecione uma empresa para visualizar o histórico de saldos.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex justify-end">
        <DateRangePicker
          date={dateRange}
          setDate={setDateRange}
          placeholder="Filtrar por período"
          className="w-full md:w-auto"
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Data de Referência</TableHead>
              <TableHead>Banco / Caixa</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor (R$)</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(parseISO(row.reference_date), 'dd/MM/yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>{row.banks?.name || 'Desconhecido'}</TableCell>
                  <TableCell>{row.banks?.account_number || '-'}</TableCell>
                  <TableCell className="text-right font-bold">
                    {row.amount.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingBalance(row)}
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                        onClick={() => setDeleteId(row.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControl
        currentPage={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O saldo será removido do
              histórico e os cálculos serão atualizados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {companyId && (
        <BalanceFormDialog
          open={!!editingBalance}
          onOpenChange={(open) => !open && setEditingBalance(null)}
          banks={banks}
          companyId={companyId}
          onSuccess={handleEditSuccess}
          initialData={editingBalance}
        />
      )}
    </div>
  )
}
