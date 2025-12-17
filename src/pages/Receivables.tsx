import { useState, useMemo, useCallback } from 'react'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  MoreHorizontal,
  Upload,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  RefreshCcw,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { format, parseISO, isSameDay, startOfDay, endOfDay } from 'date-fns'
import { DateRange } from 'react-day-picker'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { Receivable } from '@/lib/types'
import { FinancialStats } from '@/components/financial/FinancialStats'
import { ReceivableForm } from '@/components/financial/ReceivableForm'
import { ImportDialog } from '@/components/common/ImportDialog'
import { ReceivableFilters } from '@/components/financial/ReceivableFilters'
import { cn } from '@/lib/utils'

export default function Receivables() {
  const {
    receivables,
    updateReceivable,
    deleteReceivable,
    addReceivable,
    loading,
    recalculateCashFlow,
  } = useCashFlowStore()

  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dueDateRange, setDueDateRange] = useState<DateRange | undefined>()
  const [issueDateRange, setIssueDateRange] = useState<DateRange | undefined>()
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Receivable | null>(null)
  const [viewingItem, setViewingItem] = useState<Receivable | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const hasActiveFilters =
    searchTerm !== '' ||
    statusFilter !== 'all' ||
    dueDateRange !== undefined ||
    issueDateRange !== undefined ||
    minValue !== '' ||
    maxValue !== ''

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setDueDateRange(undefined)
    setIssueDateRange(undefined)
    setMinValue('')
    setMaxValue('')
    toast.info('Filtros limpos.')
  }

  const reloadReceivables = useCallback(() => {
    recalculateCashFlow()
  }, [recalculateCashFlow])

  const filteredData = useMemo(() => {
    return receivables.filter((t) => {
      // 1. Search Term
      const term = searchTerm.toLowerCase()
      const matchesTerm =
        (t.customer || '').toLowerCase().includes(term) ||
        (t.invoice_number || '').toLowerCase().includes(term) ||
        (t.order_number || '').toLowerCase().includes(term) ||
        (t.customer_code || '').toLowerCase().includes(term)

      if (!matchesTerm) return false

      // 2. Status
      let matchesStatus = true
      if (statusFilter === 'all') {
        matchesStatus = true
      } else if (statusFilter === 'vencida') {
        // Overdue: Status Open AND Due Date < Today
        const today = startOfDay(new Date())
        const itemDate = t.due_date ? parseISO(t.due_date) : null
        matchesStatus =
          t.title_status === 'Aberto' && !!itemDate && itemDate < today
      } else if (statusFilter === 'a_vencer') {
        // To Due: Status Open AND Due Date >= Today
        const today = startOfDay(new Date())
        const itemDate = t.due_date ? parseISO(t.due_date) : null
        matchesStatus =
          t.title_status === 'Aberto' && !!itemDate && itemDate >= today
      } else {
        matchesStatus = t.title_status === statusFilter
      }

      if (!matchesStatus) return false

      // 3. Due Date
      if (dueDateRange?.from) {
        if (!t.due_date) return false
        const itemDate = parseISO(t.due_date)
        if (dueDateRange.to) {
          if (
            itemDate < startOfDay(dueDateRange.from) ||
            itemDate > endOfDay(dueDateRange.to)
          ) {
            return false
          }
        } else {
          if (!isSameDay(itemDate, dueDateRange.from)) {
            return false
          }
        }
      }

      // 4. Issue Date
      if (issueDateRange?.from) {
        if (!t.issue_date) return false
        const itemDate = parseISO(t.issue_date)
        if (issueDateRange.to) {
          if (
            itemDate < startOfDay(issueDateRange.from) ||
            itemDate > endOfDay(issueDateRange.to)
          ) {
            return false
          }
        } else {
          if (!isSameDay(itemDate, issueDateRange.from)) {
            return false
          }
        }
      }

      // 5. Value
      const val = t.principal_value || 0
      if (minValue && val < parseFloat(minValue)) return false
      if (maxValue && val > parseFloat(maxValue)) return false

      return true
    })
  }, [
    receivables,
    searchTerm,
    statusFilter,
    dueDateRange,
    issueDateRange,
    minValue,
    maxValue,
  ])

  const openReceivables = filteredData.filter(
    (r) => r.title_status === 'Aberto',
  )
  const liquidatedReceivables = filteredData.filter(
    (r) => r.title_status === 'Liquidado',
  )

  const sumValues = (items: Receivable[]) =>
    items.reduce(
      (acc, curr) => ({
        principal: acc.principal + (curr.principal_value || 0),
        fine: acc.fine + (curr.fine || 0),
        interest: acc.interest + (curr.interest || 0),
        total: acc.total + (curr.updated_value || 0),
      }),
      { principal: 0, fine: 0, interest: 0, total: 0 },
    )

  const openStats = sumValues(openReceivables)
  const liquidatedStats = sumValues(liquidatedReceivables)
  const totalStats = sumValues(filteredData)

  const handleDelete = async () => {
    if (deletingId) {
      await deleteReceivable(deletingId)
      toast.success('Título removido com sucesso.')
      setDeletingId(null)
    }
  }

  const handleSaveEdit = async (updated: Receivable) => {
    if (updated.id) {
      await updateReceivable(updated)
      toast.success('Título atualizado com sucesso!')
    } else {
      await addReceivable(updated)
    }
    setEditingItem(null)
  }

  const formatCurrency = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Helper to determine status badge appearance
  const getStatusBadge = (item: Receivable) => {
    const today = startOfDay(new Date())
    const dueDate = item.due_date ? parseISO(item.due_date) : null

    if (item.title_status === 'Liquidado') {
      return {
        label: 'Liquidado',
        className:
          'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-transparent',
      }
    }

    if (item.title_status === 'Cancelado') {
      return {
        label: 'Cancelado',
        className: 'bg-muted text-muted-foreground hover:bg-muted/80',
      }
    }

    if (item.title_status === 'Aberto') {
      if (dueDate && dueDate < today) {
        // Overdue -> Red
        return {
          label: 'Aberto',
          className:
            'bg-red-100 text-red-800 hover:bg-red-200 border-transparent',
        }
      } else {
        // To Due -> Green
        return {
          label: 'A Vencer',
          className:
            'bg-green-100 text-green-800 hover:bg-green-200 border-transparent',
        }
      }
    }

    // Fallback
    return {
      label: item.title_status,
      className: 'bg-secondary text-secondary-foreground',
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Contas a Receber
          </h2>
          <p className="text-muted-foreground">
            Gestão detalhada de títulos e importação de dados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => recalculateCashFlow()}
            disabled={loading}
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
          </Button>

          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Títulos
          </Button>

          <ImportDialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
            type="receivable"
            title="Importar Contas a Receber"
            onImported={reloadReceivables}
          />

          <Button onClick={() => setEditingItem({} as Receivable)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Manual
          </Button>
        </div>
      </div>

      <FinancialStats
        stats={[
          {
            label: 'Total Geral (Filtrado)',
            ...totalStats,
            color: 'primary',
            icon: Briefcase,
            onClick: () => {
              setStatusFilter('all')
              toast.info('Exibindo todos os títulos.')
            },
          },
          {
            label: 'Total Aberto (Filtrado)',
            ...openStats,
            color: 'custom-red',
            icon: AlertCircle,
            onClick: () => {
              setStatusFilter('Aberto')
              toast.info('Filtrando por títulos em aberto.')
            },
          },
          {
            label: 'Total Liquidado (Filtrado)',
            ...liquidatedStats,
            color: 'custom-green',
            icon: CheckCircle2,
            onClick: () => {
              setStatusFilter('Liquidado')
              toast.info('Filtrando por títulos liquidados.')
            },
          },
        ]}
      />

      <ReceivableFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        status={statusFilter}
        setStatus={setStatusFilter}
        dueDateRange={dueDateRange}
        setDueDateRange={setDueDateRange}
        issueDateRange={issueDateRange}
        setIssueDateRange={setIssueDateRange}
        minValue={minValue}
        setMinValue={setMinValue}
        maxValue={maxValue}
        setMaxValue={setMaxValue}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listagem de Títulos</CardTitle>
              <CardDescription>
                Exibindo {filteredData.length} registros
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">NF</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="w-[50px]">UF</TableHead>
                  <TableHead className="w-[100px]">Vencimento</TableHead>
                  <TableHead className="text-right w-[120px]">
                    Principal
                  </TableHead>
                  <TableHead className="text-right w-[120px]">
                    Multa/Juros
                  </TableHead>
                  <TableHead className="text-right font-bold w-[120px]">
                    Atualizado
                  </TableHead>
                  <TableHead className="text-right w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {loading
                        ? 'Carregando...'
                        : 'Nenhum título encontrado com os filtros atuais.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => {
                    const statusBadge = getStatusBadge(item)
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-medium">
                          {item.invoice_number}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[10px] px-1.5 py-0 font-medium border',
                              statusBadge.className,
                            )}
                          >
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate text-xs"
                          title={item.customer}
                        >
                          {item.customer}
                          {item.customer_code && (
                            <span className="block text-[10px] text-muted-foreground">
                              {item.customer_code}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.uf || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.due_date
                            ? format(parseISO(item.due_date), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatCurrency(item.principal_value)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatCurrency(
                            (item.fine || 0) + (item.interest || 0),
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs">
                          {formatCurrency(
                            item.updated_value || item.principal_value,
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setViewingItem(item)}
                              >
                                <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeletingId(item.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Editar Título' : 'Novo Título'}
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <ReceivableForm
              initialData={editingItem}
              onSave={handleSaveEdit}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Título</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="font-semibold">Cliente:</span>
                <span>{viewingItem.customer}</span>
                <span className="font-semibold">Código:</span>
                <span>{viewingItem.customer_code || '-'}</span>
                <span className="font-semibold">NF:</span>
                <span>{viewingItem.invoice_number}</span>
                <span className="font-semibold">Pedido:</span>
                <span>{viewingItem.order_number || '-'}</span>
                <span className="font-semibold">Emissão:</span>
                <span>
                  {viewingItem.issue_date
                    ? format(parseISO(viewingItem.issue_date), 'dd/MM/yyyy')
                    : '-'}
                </span>
                <span className="font-semibold">Vencimento:</span>
                <span>
                  {viewingItem.due_date
                    ? format(parseISO(viewingItem.due_date), 'dd/MM/yyyy')
                    : '-'}
                </span>
                <span className="font-semibold">UF:</span>
                <span>{viewingItem.uf || '-'}</span>
                <span className="font-semibold">Valor Principal:</span>
                <span>{formatCurrency(viewingItem.principal_value)}</span>
                <span className="font-semibold">Valor Atualizado:</span>
                <span className="font-bold">
                  {formatCurrency(
                    viewingItem.updated_value || viewingItem.principal_value,
                  )}
                </span>
                <span className="font-semibold">Status:</span>
                <span>{viewingItem.title_status}</span>
                <span className="font-semibold">Parcela:</span>
                <span>{viewingItem.installment || '-'}</span>
                <span className="font-semibold">Vendedor:</span>
                <span>{viewingItem.seller || '-'}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente o título do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
