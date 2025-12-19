import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Upload,
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
import { format, parseISO } from 'date-fns'
import useProductImportStore from '@/stores/useProductImportStore'
import { ProductImport } from '@/lib/types'
import { ProductImportForm } from '@/components/imports/ProductImportForm'
import { useQuery } from '@/hooks/use-query'
import { getVisibleCompanyIds } from '@/services/financial'
import {
  fetchPaginatedProductImports,
  getProductImportFinancialTotals,
} from '@/services/product-imports'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { useAuth } from '@/hooks/use-auth'
import { useDebounce } from '@/hooks/use-debounce'
import { PaginationControl } from '@/components/common/PaginationControl'
import { ImportDialog } from '@/components/common/ImportDialog'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { DateRange } from 'react-day-picker'

export default function CustomsClearance() {
  const { addImport, updateImport, deleteImport } = useProductImportStore()
  const { selectedCompanyId } = useCashFlowStore()
  const { user } = useAuth()

  const [pageSize, setPageSize] = useState(30)
  const [page, setPage] = useState(1)

  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const [editingItem, setEditingItem] = useState<Partial<ProductImport> | null>(
    null,
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const debouncedSearch = useDebounce(searchTerm, 400)

  // Fetch Data
  const {
    data: paginatedData,
    isLoading,
    refetch,
  } = useQuery(
    `product-imports-customs-${selectedCompanyId}-${page}-${pageSize}-${debouncedSearch}-${dateRange?.from}-${dateRange?.to}`,
    async () => {
      if (!user) return { data: [], count: 0 }
      const visibleIds = await getVisibleCompanyIds(user.id)

      const filteredIds =
        selectedCompanyId && selectedCompanyId !== 'all'
          ? [selectedCompanyId]
          : visibleIds

      if (filteredIds.length === 0) return { data: [], count: 0 }

      return fetchPaginatedProductImports(filteredIds, page, pageSize, {
        search: debouncedSearch,
        dateRange: dateRange
          ? { from: dateRange.from!, to: dateRange.to }
          : undefined,
      })
    },
    {
      enabled: !!user,
      staleTime: 60000,
      dependencies: [
        selectedCompanyId,
        page,
        pageSize,
        debouncedSearch,
        dateRange,
      ],
    },
  )

  // Fetch Financial Totals (KPIs)
  const { data: totals } = useQuery(
    `product-imports-totals-${selectedCompanyId}-${debouncedSearch}-${dateRange?.from}-${dateRange?.to}`,
    async () => {
      if (!user) return null
      const visibleIds = await getVisibleCompanyIds(user.id)
      const filteredIds =
        selectedCompanyId && selectedCompanyId !== 'all'
          ? [selectedCompanyId]
          : visibleIds

      if (filteredIds.length === 0) return null

      return getProductImportFinancialTotals(
        filteredIds,
        dateRange ? { from: dateRange.from!, to: dateRange.to } : undefined,
        debouncedSearch,
      )
    },
    {
      enabled: !!user,
      dependencies: [selectedCompanyId, dateRange, debouncedSearch],
    },
  )

  const handleSave = async (data: Partial<ProductImport>) => {
    if (data.id) {
      await updateImport(data)
    } else {
      await addImport(data)
    }
    setEditingItem(null)
    refetch()
  }

  const handleDelete = async () => {
    if (deletingId) {
      await deleteImport(deletingId)
      setDeletingId(null)
      refetch()
    }
  }

  const formatValue = (
    val: string | number | null | undefined,
    type: 'currency' | 'date' | 'text' = 'text',
  ) => {
    if (val === null || val === undefined || val === '') return '-'
    if (type === 'currency' && (val === 0 || val === '0')) return '-'
    if (type === 'text' && String(val).trim() === '') return '-'

    if (type === 'currency') {
      return Number(val).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    }
    if (type === 'date') {
      try {
        return format(parseISO(String(val)), 'dd/MM/yyyy')
      } catch {
        return String(val)
      }
    }
    return String(val)
  }

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Desembaraço Aduaneiro
          </h2>
          <p className="text-muted-foreground">
            Gestão de processos de importação e custos de nacionalização.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
          <Button onClick={() => setEditingItem({} as ProductImport)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Financial Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <MetricCard
          title="Total Saldo"
          value={totals?.total_balance || 0}
          description="Saldo atual (R$)"
          isCurrency={true}
        />
        <MetricCard
          title="Total Est. s/ Imposto"
          value={totals?.total_estimate_without_tax || 0}
          description="Estimativa sem ICMS"
          isCurrency={true}
        />
        <MetricCard
          title="Total ICMS"
          value={totals?.total_icms_tax || 0}
          description="Incidência de ICMS"
          isCurrency={true}
        />
        <MetricCard
          title="Total Est. Final"
          value={totals?.total_final_estimate || 0}
          description="Valor final estimado"
          isCurrency={true}
        />
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col border shadow-sm">
        <CardHeader className="py-4 shrink-0 border-b bg-muted/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar Invoice, Processo, Fornecedor..."
                  className="pl-9 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-auto">
                <DateRangePicker
                  date={dateRange}
                  setDate={setDateRange}
                  placeholder="Vencimento"
                />
              </div>
            </div>

            <CardDescription className="text-xs">
              {paginatedData?.count || 0} registros encontrados
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto relative bg-background">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[80px]">Linha</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>NF</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Prev. Desemb.</TableHead>
                <TableHead className="text-right">Est. s/ Imposto</TableHead>
                <TableHead className="text-right">ICMS</TableHead>
                <TableHead className="text-right">Est. Final</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : !paginatedData || paginatedData.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={13}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.data.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50 text-xs">
                    <TableCell className="font-medium">
                      {formatValue(item.line, 'text')}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatValue(item.process_number, 'text')}
                    </TableCell>
                    <TableCell
                      className="truncate max-w-[150px]"
                      title={item.international_supplier}
                    >
                      {formatValue(item.international_supplier, 'text')}
                    </TableCell>
                    <TableCell
                      className="truncate max-w-[150px]"
                      title={item.situation}
                    >
                      {formatValue(item.situation, 'text')}
                    </TableCell>
                    <TableCell>{formatValue(item.nf_number, 'text')}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatValue(item.balance, 'currency')}
                    </TableCell>
                    <TableCell>{formatValue(item.due_date, 'date')}</TableCell>
                    <TableCell>
                      {formatValue(item.clearance_forecast_date, 'date')}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatValue(item.estimate_without_tax, 'currency')}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatValue(item.icms_tax, 'currency')}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">
                      {formatValue(item.final_clearance_estimate, 'currency')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                            ${
                              item.clearance_status === 'Concluído'
                                ? 'bg-green-100 text-green-800'
                                : item.clearance_status === 'Cancelado'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                      >
                        {item.clearance_status || 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="shrink-0 border-t bg-muted/5">
          <PaginationControl
            currentPage={page}
            totalCount={paginatedData?.count || 0}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Card>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id
                ? 'Editar Processo'
                : 'Novo Processo de Importação'}
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <ProductImportForm
              initialData={editingItem}
              onSave={handleSave}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de importação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        type="product_import"
        title="Importar Desembaraço"
        onImported={() => refetch()}
      />
    </div>
  )
}
