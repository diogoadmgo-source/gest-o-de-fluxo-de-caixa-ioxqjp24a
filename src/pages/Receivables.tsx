import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReceivableFilters } from '@/components/financial/ReceivableFilters'
import { ReceivableForm } from '@/components/financial/ReceivableForm'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useQuery } from '@/hooks/use-query'
import { fetchPaginatedReceivables } from '@/services/financial'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { useDebounce } from '@/hooks/use-debounce'
import {
  Loader2,
  Plus,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertCircle,
  ArrowUpDown,
  Search,
} from 'lucide-react'
import { usePerformanceMeasure } from '@/lib/performance'
import { ImportDialog } from '@/components/common/ImportDialog'
import { ReceivableDashboard } from '@/components/financial/ReceivableDashboard'
import { Badge } from '@/components/ui/badge'
import { PaginationControl } from '@/components/common/PaginationControl'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format, parseISO, isValid } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn, parsePtBrFloat } from '@/lib/utils'

export default function Receivables() {
  const {
    selectedCompanyId,
    addReceivable,
    updateReceivable,
    deleteReceivable,
  } = useCashFlowStore()
  const perf = usePerformanceMeasure('/recebiveis', 'render')

  // State
  const [pageSize, setPageSize] = useState(30)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [dataVersion, setDataVersion] = useState(0)

  // Advanced filters state
  const [dueDateRange, setDueDateRange] = useState<any>(undefined)
  const [issueDateRange, setIssueDateRange] = useState<any>(undefined)
  const [createdAtRange, setCreatedAtRange] = useState<any>(undefined)
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')

  const debouncedSearch = useDebounce(searchTerm, 400)

  // Auto-reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [
    debouncedSearch,
    statusFilter,
    JSON.stringify(dueDateRange),
    JSON.stringify(issueDateRange),
    JSON.stringify(createdAtRange),
    minValue,
    maxValue,
  ])

  // Data Fetching
  const {
    data: paginatedData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    `receivables-${selectedCompanyId}-${page}-${pageSize}-${debouncedSearch}-${statusFilter}-${JSON.stringify(dueDateRange)}-${JSON.stringify(issueDateRange)}-${JSON.stringify(createdAtRange)}-${dataVersion}`,
    () => {
      if (!selectedCompanyId || selectedCompanyId === 'all')
        return Promise.resolve({ data: [], count: 0, error: null })
      return fetchPaginatedReceivables(selectedCompanyId, page, pageSize, {
        search: debouncedSearch,
        status: statusFilter,
        dateRange: dueDateRange,
        issueDateRange: issueDateRange,
        createdAtRange: createdAtRange,
      })
    },
    {
      enabled: !!selectedCompanyId && selectedCompanyId !== 'all',
      staleTime: 60000,
    },
  )

  if (!isLoading) perf.end({ count: paginatedData?.count })

  const items =
    paginatedData?.data && Array.isArray(paginatedData.data)
      ? paginatedData.data
      : []

  const totalCount =
    typeof paginatedData?.count === 'number' ? paginatedData.count : 0

  const handleSave = async (data: any) => {
    if (data.id) await updateReceivable(data)
    else await addReceivable(data)
    setEditingItem(null)
    refetch()
    setDataVersion((v) => v + 1)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este título?')) {
      await deleteReceivable(id)
      refetch()
      setDataVersion((v) => v + 1)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      const date = parseISO(dateStr)
      if (!isValid(date)) return dateStr
      return format(date, 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  // Safe number parsing
  const toNumber = (value: any) => {
    if (value === null || value === undefined) return 0
    if (typeof value === 'number') return value
    // If it's a string, use our robust parser
    return parsePtBrFloat(value)
  }

  const getStatusBadge = (status: string, dueDate: string) => {
    const today = new Date().toISOString().split('T')[0]
    const isOverdue = dueDate < today && status === 'Aberto'

    if (status === 'Liquidado')
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600 border-emerald-600/20 text-white shadow-none font-medium">
          Liquidado
        </Badge>
      )
    if (status === 'Cancelado')
      return (
        <Badge variant="destructive" className="shadow-none">
          Cancelado
        </Badge>
      )
    if (isOverdue)
      return (
        <Badge
          variant="destructive"
          className="bg-rose-500 hover:bg-rose-600 border-rose-600/20 shadow-none"
        >
          Vencido
        </Badge>
      )
    return (
      <Badge
        variant="secondary"
        className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 shadow-none"
      >
        Aberto
      </Badge>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in pb-2 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Contas a Receber
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestão completa de recebíveis e títulos.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() => setIsImportOpen(true)}
            disabled={!selectedCompanyId || selectedCompanyId === 'all'}
            title={
              !selectedCompanyId || selectedCompanyId === 'all'
                ? 'Selecione uma empresa para importar'
                : 'Importar'
            }
          >
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            onClick={() => setEditingItem({})}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Título
          </Button>
        </div>
      </div>

      <div className="shrink-0">
        <ReceivableDashboard items={items} />
      </div>

      <div className="shrink-0">
        <ReceivableFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          status={statusFilter}
          setStatus={setStatusFilter}
          dueDateRange={dueDateRange}
          setDueDateRange={setDueDateRange}
          issueDateRange={issueDateRange}
          setIssueDateRange={setIssueDateRange}
          createdAtRange={createdAtRange}
          setCreatedAtRange={setCreatedAtRange}
          minValue={minValue}
          setMinValue={setMinValue}
          maxValue={maxValue}
          setMaxValue={setMaxValue}
          onClearFilters={() => {
            setSearchTerm('')
            setStatusFilter('all')
            setDueDateRange(undefined)
            setIssueDateRange(undefined)
            setCreatedAtRange(undefined)
            setMinValue('')
            setMaxValue('')
            setPage(1)
          }}
          hasActiveFilters={
            !!searchTerm ||
            statusFilter !== 'all' ||
            !!dueDateRange ||
            !!issueDateRange ||
            !!createdAtRange ||
            !!minValue ||
            !!maxValue
          }
        />
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col border shadow-sm">
        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col relative bg-background">
          {(error || paginatedData?.error) && (
            <div className="p-4 shrink-0">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {error ? 'Erro real do hook' : 'Erro ao carregar dados'}
                </AlertTitle>
                <AlertDescription>
                  {error
                    ? (error as any)?.message || String(error)
                    : paginatedData?.error?.message ||
                      JSON.stringify(paginatedData?.error)}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !selectedCompanyId || selectedCompanyId === 'all' ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
              <p>Selecione uma empresa para visualizar os dados.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto relative">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="min-w-[140px] font-semibold text-foreground">
                      NF / Pedido
                    </TableHead>
                    <TableHead className="min-w-[220px] font-semibold text-foreground">
                      Cliente
                    </TableHead>
                    <TableHead className="min-w-[110px] font-semibold text-foreground">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                        Vencimento
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[100px] text-center font-semibold text-foreground">
                      Status
                    </TableHead>
                    <TableHead className="min-w-[200px] font-semibold text-foreground">
                      Descrição
                    </TableHead>
                    <TableHead className="min-w-[110px] font-semibold text-foreground">
                      Criação
                    </TableHead>
                    <TableHead className="min-w-[80px] text-center font-semibold text-foreground">
                      Atraso
                    </TableHead>
                    <TableHead className="min-w-[120px] text-right font-semibold text-foreground">
                      Valor
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center h-48 text-muted-foreground"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-8 w-8 opacity-20" />
                          <p>
                            {totalCount > 0
                              ? 'Nenhum dado encontrado para esta página.'
                              : 'Nenhum título encontrado com os filtros atuais.'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow
                        key={item.id}
                        className="group cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
                        onClick={() => setEditingItem(item)}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span
                              className="font-medium text-sm truncate"
                              title={item.invoice_number}
                            >
                              {item.invoice_number || '-'}
                            </span>
                            {item.order_number && (
                              <Badge
                                variant="outline"
                                className="w-fit text-[10px] h-4 px-1 text-muted-foreground font-normal border-border/60"
                              >
                                {item.order_number}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col max-w-[300px]">
                            <span
                              className="font-medium truncate text-sm"
                              title={item.customer}
                            >
                              {item.customer}
                            </span>
                            {item.customer_name &&
                              item.customer_name !== item.customer && (
                                <span
                                  className="text-[11px] text-muted-foreground truncate"
                                  title={item.customer_name}
                                >
                                  {item.customer_name}
                                </span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {formatDate(item.due_date)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.title_status, item.due_date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs text-muted-foreground max-w-[250px]">
                            <span
                              className="truncate font-medium text-foreground/80"
                              title={item.description}
                            >
                              {item.description || '-'}
                            </span>
                            {item.new_status && (
                              <span
                                title="Status Secundário"
                                className="truncate text-[10px] bg-muted w-fit px-1 rounded"
                              >
                                {item.new_status}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-xs text-muted-foreground"
                            title={
                              item.created_at
                                ? format(
                                    parseISO(item.created_at),
                                    'dd/MM/yyyy HH:mm',
                                  )
                                : '-'
                            }
                          >
                            {formatDate(item.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const days = item.days_overdue || 0
                            if (days <= 0)
                              return (
                                <span className="text-muted-foreground text-xs opacity-50">
                                  -
                                </span>
                              )
                            return (
                              <Badge
                                variant="outline"
                                className="text-red-600 bg-red-50 border-red-200 font-bold text-xs hover:bg-red-100"
                              >
                                {days}d
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-sm">
                            {toNumber(
                              item.updated_value || item.principal_value,
                            ).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                              >
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <div className="shrink-0 border-t bg-muted/5 p-2">
          <PaginationControl
            currentPage={page}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Card>

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-[800px]">
          <ReceivableForm
            initialData={editingItem}
            onSave={handleSave}
            onCancel={() => setEditingItem(null)}
          />
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        type="receivable"
        title="Importar Recebíveis"
        onImported={() => {
          refetch()
          setDataVersion((v) => v + 1)
        }}
      />
    </div>
  )
}
