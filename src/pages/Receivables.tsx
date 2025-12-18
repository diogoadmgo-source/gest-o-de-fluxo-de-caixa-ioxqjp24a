import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Loader2, Plus, RefreshCw, Upload } from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from '@/components/ui/pagination'
import { usePerformanceMeasure } from '@/lib/performance'
import { ImportDialog } from '@/components/common/ImportDialog'

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

  const debouncedSearch = useDebounce(searchTerm, 500)

  // Data Fetching
  const {
    data: paginatedData,
    isLoading,
    refetch,
  } = useQuery(
    `receivables-${selectedCompanyId}-${page}-${debouncedSearch}-${statusFilter}`,
    () => {
      if (!selectedCompanyId || selectedCompanyId === 'all')
        return Promise.resolve({ data: [], count: 0 })
      return fetchPaginatedReceivables(selectedCompanyId, page, 20, {
        search: debouncedSearch,
        status: statusFilter,
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

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Contas a Receber
          </h2>
          <p className="text-muted-foreground">
            Otimizado para alto volume de dados.
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

      <ReceivableFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        status={statusFilter}
        setStatus={setStatusFilter}
        dueDateRange={undefined}
        setDueDateRange={() => {}}
        issueDateRange={undefined}
        setIssueDateRange={() => {}}
        createdAtRange={undefined}
        setCreatedAtRange={() => {}}
        minValue=""
        setMinValue={() => {}}
        maxValue=""
        setMaxValue={() => {}}
        onClearFilters={() => {
          setSearchTerm('')
          setStatusFilter('all')
        }}
        hasActiveFilters={!!searchTerm || statusFilter !== 'all'}
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NF</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData?.data.map((item: any) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setEditingItem(item)}
                    >
                      <TableCell>{item.invoice_number}</TableCell>
                      <TableCell>{item.customer}</TableCell>
                      <TableCell>{item.due_date}</TableCell>
                      <TableCell className="text-right">
                        {(
                          item.updated_value || item.principal_value
                        ).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell>{item.title_status}</TableCell>
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
        <DialogContent className="sm:max-w-[600px]">
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
        onImported={refetch}
      />
    </div>
  )
}
