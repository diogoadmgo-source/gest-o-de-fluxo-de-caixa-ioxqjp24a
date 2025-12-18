import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ReceivableFilters } from '@/components/financial/ReceivableFilters'
import { ReceivableForm } from '@/components/financial/ReceivableForm'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useQuery } from '@/hooks/use-query'
import { fetchPaginatedReceivables } from '@/services/financial'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { useDebounce } from '@/hooks/use-debounce'
import { Loader2, Plus, Upload } from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination'
import { usePerformanceMeasure } from '@/lib/performance'
import { ImportDialog } from '@/components/common/ImportDialog'
import { ReceivableStats } from '@/components/financial/ReceivableStats'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

export default function Receivables() {
  const { selectedCompanyId, addReceivable, updateReceivable } =
    useCashFlowStore()
  const perf = usePerformanceMeasure('/recebiveis', 'render')

  // State
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  // Advanced filters state
  const [dueDateRange, setDueDateRange] = useState<any>(undefined)
  const [issueDateRange, setIssueDateRange] = useState<any>(undefined)
  const [createdAtRange, setCreatedAtRange] = useState<any>(undefined)
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')

  const debouncedSearch = useDebounce(searchTerm, 500)

  // Data Fetching
  const {
    data: paginatedData,
    isLoading,
    refetch,
  } = useQuery(
    `receivables-${selectedCompanyId}-${page}-${debouncedSearch}-${statusFilter}-${JSON.stringify(dueDateRange)}`,
    () => {
      if (!selectedCompanyId || selectedCompanyId === 'all')
        return Promise.resolve({ data: [], count: 0 })
      return fetchPaginatedReceivables(selectedCompanyId, page, 20, {
        search: debouncedSearch,
        status: statusFilter,
        dateRange: dueDateRange,
      })
    },
    {
      enabled: !!selectedCompanyId && selectedCompanyId !== 'all',
      staleTime: 30000,
    },
  )

  const totalPages = paginatedData ? Math.ceil(paginatedData.count / 20) : 0

  // Finish measure
  if (!isLoading) perf.end({ count: paginatedData?.count })

  const handleSave = async (data: any) => {
    if (data.id) await updateReceivable(data)
    else await addReceivable(data)
    setEditingItem(null)
    refetch()
  }

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'Aberto'
    if (status === 'Liquidado')
      return <Badge className="bg-emerald-500">Liquidado</Badge>
    if (status === 'Cancelado')
      return <Badge variant="destructive">Cancelado</Badge>
    if (isOverdue)
      return (
        <Badge variant="destructive" className="bg-rose-500">
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
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Contas a Receber
          </h2>
          <p className="text-muted-foreground">
            Gestão completa de recebíveis e títulos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
          <Button onClick={() => setEditingItem({})}>
            <Plus className="mr-2 h-4 w-4" /> Novo Título
          </Button>
        </div>
      </div>

      {/* Dashboard Stats Panel */}
      <ReceivableStats companyId={selectedCompanyId} />

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
        }}
        hasActiveFilters={
          !!searchTerm || statusFilter !== 'all' || !!dueDateRange
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !selectedCompanyId || selectedCompanyId === 'all' ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <p>Selecione uma empresa para visualizar os dados.</p>
            </div>
          ) : paginatedData?.data.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
              <p>Nenhum título encontrado.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NF / Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData?.data.map((item: any) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setEditingItem(item)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {item.invoice_number}
                          </span>
                          {item.order_number && (
                            <span className="text-xs text-muted-foreground">
                              Ped: {item.order_number}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={item.customer}
                      >
                        {item.customer}
                      </TableCell>
                      <TableCell>
                        {item.due_date
                          ? format(new Date(item.due_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {item.issue_date
                          ? format(new Date(item.issue_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(
                          item.updated_value || item.principal_value
                        ).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(item.title_status, item.due_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 border-t">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (page > 1) setPage((p) => p - 1)
                        }}
                      />
                    </PaginationItem>
                    <span className="px-4 text-sm text-muted-foreground">
                      Página {page} de {totalPages || 1}
                    </span>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (page < totalPages) setPage((p) => p + 1)
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
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
          // Force refresh of stats by invalidating query
          // stats component will refetch automatically if keys match, but explicit invalidation helps
        }}
      />
    </div>
  )
}
