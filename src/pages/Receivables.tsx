import { useState } from 'react'
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
} from 'lucide-react'
import { usePerformanceMeasure } from '@/lib/performance'
import { ImportDialog } from '@/components/common/ImportDialog'
import { ReceivableStats } from '@/components/financial/ReceivableStats'
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

  // Data Fetching
  const {
    data: paginatedData,
    isLoading,
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

  const toNumber = (value: any) => {
    if (value === null || value === undefined) return 0
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      if (value.includes(',')) {
        const normalized = value.replace(/\./g, '').replace(',', '.')
        const parsed = parseFloat(normalized)
        return isNaN(parsed) ? 0 : parsed
      }
      const parsed = parseFloat(value)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  const getStatusBadge = (status: string, dueDate: string) => {
    const today = new Date().toISOString().split('T')[0]
    const isOverdue = dueDate < today && status === 'Aberto'

    if (status === 'Liquidado')
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600">Liquidado</Badge>
      )
    if (status === 'Cancelado')
      return <Badge variant="destructive">Cancelado</Badge>
    if (isOverdue)
      return (
        <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600">
          Vencido
        </Badge>
      )
    return (
      <Badge
        variant="secondary"
        className="bg-blue-100 text-blue-700 hover:bg-blue-200"
      >
        Aberto
      </Badge>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-2 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Contas a Receber
          </h2>
          <p className="text-muted-foreground">
            Gestão completa de recebíveis e títulos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
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
          <Button onClick={() => setEditingItem({})}>
            <Plus className="mr-2 h-4 w-4" /> Novo Título
          </Button>
        </div>
      </div>

      <div className="shrink-0">
        <ReceivableStats
          companyId={selectedCompanyId}
          lastUpdate={dataVersion}
        />
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
            !!minValue
          }
        />
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col border shadow-sm">
        <CardHeader className="py-4 shrink-0 border-b bg-muted/5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Listagem de Títulos</CardTitle>
              <CardDescription className="text-xs">
                {totalCount} registros encontrados
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col relative bg-background">
          {paginatedData?.error && (
            <div className="p-4 shrink-0">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro ao carregar dados</AlertTitle>
                <AlertDescription>
                  {paginatedData.error.message ||
                    JSON.stringify(paginatedData.error)}
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
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[15%]">NF / Pedido</TableHead>
                    <TableHead className="w-[20%]">Cliente</TableHead>
                    <TableHead className="w-[12%]">Vencimento</TableHead>
                    <TableHead className="w-[10%] text-center">
                      Status
                    </TableHead>
                    <TableHead className="w-[10%]">Info</TableHead>
                    <TableHead className="w-[10%] text-center">
                      Atraso
                    </TableHead>
                    <TableHead className="w-[10%] text-right">Valor</TableHead>
                    <TableHead className="w-[10%] text-right">
                      Atualizado
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center h-24 text-muted-foreground"
                      >
                        Nenhum título encontrado com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow
                        key={item.id}
                        className="group cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setEditingItem(item)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span
                              className="font-medium text-xs truncate"
                              title={item.invoice_number}
                            >
                              {item.invoice_number || '-'}
                            </span>
                            {item.order_number && (
                              <span
                                className="text-[10px] text-muted-foreground truncate"
                                title={`Pedido: ${item.order_number}`}
                              >
                                Ped: {item.order_number}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col max-w-[200px]">
                            <span
                              className="font-medium truncate text-xs"
                              title={item.customer}
                            >
                              {item.customer}
                            </span>
                            {item.customer_name &&
                              item.customer_name !== item.customer && (
                                <span
                                  className="text-[10px] text-muted-foreground truncate"
                                  title={item.customer_name}
                                >
                                  {item.customer_name}
                                </span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {formatDate(item.due_date)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Emis: {formatDate(item.issue_date)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.title_status, item.due_date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-[10px] text-muted-foreground">
                            {item.new_status && (
                              <span
                                title="Status Secundário"
                                className="truncate max-w-[100px]"
                              >
                                {item.new_status}
                              </span>
                            )}
                            {item.installment && (
                              <span>Parc: {item.installment}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const days = item.days_overdue || 0
                            if (days <= 0)
                              return (
                                <span className="text-muted-foreground text-xs">
                                  -
                                </span>
                              )
                            return (
                              <span className="text-red-600 font-bold text-xs">
                                {days}d
                              </span>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs text-muted-foreground">
                            {toNumber(item.principal_value).toLocaleString(
                              'pt-BR',
                              {
                                style: 'currency',
                                currency: 'BRL',
                              },
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-xs">
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
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="shrink-0 border-t bg-muted/5">
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
