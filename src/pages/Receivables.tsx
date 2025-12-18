import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReceivableFilters } from '@/components/financial/ReceivableFilters'
import { ReceivableForm } from '@/components/financial/ReceivableForm'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useQuery } from '@/hooks/use-query'
import { fetchPaginatedReceivables } from '@/services/financial'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { useDebounce } from '@/hooks/use-debounce'
import { Loader2, Plus, Upload } from 'lucide-react'
import { usePerformanceMeasure } from '@/lib/performance'
import { ImportDialog } from '@/components/common/ImportDialog'
import { ReceivableStats } from '@/components/financial/ReceivableStats'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { VirtualTable, VirtualTableColumn } from '@/components/ui/virtual-table'

export default function Receivables() {
  const { selectedCompanyId, addReceivable, updateReceivable } =
    useCashFlowStore()
  const perf = usePerformanceMeasure('/recebiveis', 'render')

  // State
  // We increase page size for better virtualization UX, effectively handling a "large" page
  const [pageSize] = useState(200)
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

  const debouncedSearch = useDebounce(searchTerm, 400) // 400ms delay per requirement

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
      return fetchPaginatedReceivables(selectedCompanyId, page, pageSize, {
        search: debouncedSearch,
        status: statusFilter,
        dateRange: dueDateRange,
      })
    },
    {
      enabled: !!selectedCompanyId && selectedCompanyId !== 'all',
      staleTime: 60000, // 1 min cache
    },
  )

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

  const columns: VirtualTableColumn<any>[] = [
    {
      header: 'NF / Pedido',
      width: '20%',
      cell: (item) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.invoice_number}</span>
          {item.order_number && (
            <span className="text-xs text-muted-foreground">
              Ped: {item.order_number}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Cliente',
      width: '30%',
      cell: (item) => (
        <span className="truncate block" title={item.customer}>
          {item.customer}
        </span>
      ),
    },
    {
      header: 'Vencimento',
      width: '15%',
      cell: (item) => (
        <span>
          {item.due_date ? format(new Date(item.due_date), 'dd/MM/yyyy') : '-'}
        </span>
      ),
    },
    {
      header: 'Emissão',
      width: '15%',
      cell: (item) => (
        <span>
          {item.issue_date
            ? format(new Date(item.issue_date), 'dd/MM/yyyy')
            : '-'}
        </span>
      ),
    },
    {
      header: 'Valor',
      width: '10%',
      className: 'text-right',
      cell: (item) => (
        <span className="font-medium">
          {(item.updated_value || item.principal_value).toLocaleString(
            'pt-BR',
            {
              style: 'currency',
              currency: 'BRL',
            },
          )}
        </span>
      ),
    },
    {
      header: 'Status',
      width: '10%',
      className: 'text-center',
      cell: (item) => getStatusBadge(item.title_status, item.due_date),
    },
  ]

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
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar
          </Button>
          <Button onClick={() => setEditingItem({})}>
            <Plus className="mr-2 h-4 w-4" /> Novo Título
          </Button>
        </div>
      </div>

      {/* Dashboard Stats Panel */}
      <div className="shrink-0">
        <ReceivableStats companyId={selectedCompanyId} />
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
          }}
          hasActiveFilters={
            !!searchTerm || statusFilter !== 'all' || !!dueDateRange
          }
        />
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 flex-1">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !selectedCompanyId || selectedCompanyId === 'all' ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <p>Selecione uma empresa para visualizar os dados.</p>
            </div>
          ) : (
            <div className="h-full">
              <VirtualTable
                data={paginatedData?.data || []}
                columns={columns}
                rowHeight={60}
                visibleHeight="100%"
                onRowClick={setEditingItem}
                className="h-full border-0 rounded-none"
              />
            </div>
          )}
        </CardContent>
        {/* Simple pagination for large sets if needed, though virtualization handles scroll within the set */}
        <div className="p-2 border-t text-xs text-muted-foreground text-center shrink-0">
          Mostrando {paginatedData?.data.length} de {paginatedData?.count}{' '}
          registros (Página {page})
          {/* Pagination controls could be added here if dataset > 200 */}
          <div className="flex justify-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Ant
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!paginatedData || paginatedData.data.length < pageSize}
            >
              Próx
            </Button>
          </div>
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
        }}
      />
    </div>
  )
}
