import { useState, useMemo, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FilePlus, Upload, Trash2, Edit, Loader2, BellRing } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'
import { Transaction } from '@/lib/types'
import { PayableForm } from '@/components/financial/PayableForm'
import { PayableStats } from '@/components/financial/PayableStats'
import { PayableFilters } from '@/components/financial/PayableFilters'
import { PayablesCharts } from '@/components/financial/PayablesCharts'
import { NotificationSettingsDialog } from '@/components/financial/NotificationSettingsDialog'
import {
  format,
  parseISO,
  differenceInDays,
  startOfDay,
  addDays,
} from 'date-fns'
import { ImportDialog } from '@/components/common/ImportDialog'
import { VirtualTable, VirtualTableColumn } from '@/components/ui/virtual-table'
import { useQuery } from '@/hooks/use-query'
import { fetchPaginatedPayables } from '@/services/financial'
import { useDebounce } from '@/hooks/use-debounce'
import { usePerformanceMeasure } from '@/lib/performance'
import { PaginationControl } from '@/components/common/PaginationControl'

export default function Payables() {
  const {
    selectedCompanyId,
    updatePayable,
    addPayable,
    deletePayable,
    payableStats,
    fetchPayableStats,
  } = useCashFlowStore()
  const perf = usePerformanceMeasure('/pagaveis', 'render')

  // Filters State
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [situationFilter, setSituationFilter] = useState('all')
  const [maturityPeriod, setMaturityPeriod] = useState('all')
  const [customMaturityRange, setCustomMaturityRange] = useState<any>(undefined)
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')

  // Debounce for filter inputs (required 300-500ms)
  const debouncedSearch = useDebounce(searchTerm, 400)
  const debouncedSupplier = useDebounce(supplierFilter, 400)
  const debouncedMinValue = useDebounce(minValue, 500)
  const debouncedMaxValue = useDebounce(maxValue, 500)

  // UI State
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Transaction | null>(null)

  // Derive date range from maturity period
  const effectiveDateRange = useMemo(() => {
    if (maturityPeriod === 'custom') return customMaturityRange
    if (maturityPeriod === 'today') {
      const today = new Date()
      return { from: today, to: today }
    }
    if (maturityPeriod === '7_days') {
      return { from: new Date(), to: addDays(new Date(), 7) }
    }
    if (maturityPeriod === '15_days') {
      return { from: new Date(), to: addDays(new Date(), 15) }
    }
    if (maturityPeriod === '30_days') {
      return { from: new Date(), to: addDays(new Date(), 30) }
    }
    return undefined
  }, [maturityPeriod, customMaturityRange])

  // Construct filters object
  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      supplier: debouncedSupplier,
      status: situationFilter,
      dateRange: effectiveDateRange,
      minValue: debouncedMinValue,
      maxValue: debouncedMaxValue,
    }),
    [
      debouncedSearch,
      debouncedSupplier,
      situationFilter,
      effectiveDateRange,
      debouncedMinValue,
      debouncedMaxValue,
    ],
  )

  // Fetching
  const {
    data: paginatedData,
    isLoading,
    refetch,
  } = useQuery(
    `payables-${selectedCompanyId}-${page}-${pageSize}-${JSON.stringify(filters)}`,
    () => {
      if (!selectedCompanyId || selectedCompanyId === 'all')
        return Promise.resolve({ data: [], count: 0 })

      return fetchPaginatedPayables(selectedCompanyId, page, pageSize, filters)
    },
    {
      enabled: !!selectedCompanyId && selectedCompanyId !== 'all',
      staleTime: 60000,
    },
  )

  // Fetch Stats when filters change
  useEffect(() => {
    if (selectedCompanyId && selectedCompanyId !== 'all') {
      fetchPayableStats(filters)
    }
  }, [selectedCompanyId, filters, fetchPayableStats])

  // Finish measure
  if (!isLoading) perf.end({ count: paginatedData?.count })

  const stats = useMemo(() => {
    return {
      totalToPay: payableStats?.total_to_pay || 0,
      overdue: payableStats?.overdue || 0,
      dueIn7Days: payableStats?.due_in_7_days || 0,
      dueIn30Days: payableStats?.due_in_30_days || 0,
      nextMaturityDate: payableStats?.next_maturity_date || null,
      nextMaturityValue: payableStats?.next_maturity_value || 0,
      totalCount: payableStats?.total_count || paginatedData?.count || 0,
    }
  }, [payableStats, paginatedData])

  const handleSaveEdit = async (updated: Transaction) => {
    try {
      if (updated.id) {
        await updatePayable(updated)
        toast.success('Obrigação atualizada!')
      } else {
        await addPayable(updated)
        toast.success('Nova obrigação criada!')
      }
      setEditingItem(null)
      refetch()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar obrigação.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir?')) return
    try {
      await deletePayable(id)
      toast.success('Excluído')
      refetch()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao excluir obrigação.')
    }
  }

  const getSituationBadge = (dueDateStr: string, status: string) => {
    if (status === 'paid') {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Pago
        </Badge>
      )
    }

    const today = startOfDay(new Date())
    const due = parseISO(dueDateStr)
    const days = differenceInDays(due, today)

    if (days < 0) {
      return (
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-800 hover:bg-red-200"
        >
          Vencido ({Math.abs(days)}d)
        </Badge>
      )
    } else if (days === 0) {
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800">
          Vence Hoje
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          A vencer ({days}d)
        </Badge>
      )
    }
  }

  const columns: VirtualTableColumn<Transaction>[] = [
    {
      header: 'Documento',
      width: '15%',
      cell: (item) => (
        <span className="font-medium text-xs">{item.document_number}</span>
      ),
    },
    {
      header: 'Fornecedor',
      width: '25%',
      cell: (item) => (
        <span className="truncate block" title={item.entity_name}>
          {item.entity_name}
        </span>
      ),
    },
    {
      header: 'Vencimento',
      width: '15%',
      cell: (item) => (
        <span>{format(parseISO(item.due_date), 'dd/MM/yyyy')}</span>
      ),
    },
    {
      header: 'Situação',
      width: '20%',
      cell: (item) => getSituationBadge(item.due_date, item.status),
    },
    {
      header: 'Total',
      width: '15%',
      className: 'text-right',
      cell: (item) => (
        <span className="font-bold text-sm">
          {item.amount.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </span>
      ),
    },
    {
      header: 'Ações',
      width: '10%',
      className: 'text-right',
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              setEditingItem(item)
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(item.id)
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-2 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contas a Pagar</h2>
          <p className="text-muted-foreground">
            Gestão de obrigações pendentes e projeções.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsSettingsOpen(true)}
            disabled={!selectedCompanyId || selectedCompanyId === 'all'}
          >
            <BellRing className="mr-2 h-4 w-4" />
            Alertas
          </Button>

          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>

          <ImportDialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
            type="payable"
            title="Importar Contas a Pagar"
            onImported={() => {
              refetch()
              fetchPayableStats(filters)
            }}
          />

          <Button
            variant="default"
            onClick={() => setEditingItem({} as Transaction)}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            Lançamento Manual
          </Button>
        </div>
      </div>

      <div className="shrink-0 space-y-4">
        <PayableStats {...stats} />
      </div>

      <div className="shrink-0">
        <PayableFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          supplier={supplierFilter}
          setSupplier={setSupplierFilter}
          situation={situationFilter}
          setSituation={setSituationFilter}
          maturityPeriod={maturityPeriod}
          setMaturityPeriod={setMaturityPeriod}
          customMaturityRange={customMaturityRange}
          setCustomMaturityRange={setCustomMaturityRange}
          minValue={minValue}
          setMinValue={setMinValue}
          maxValue={maxValue}
          setMaxValue={setMaxValue}
          onClearFilters={() => {
            setSearchTerm('')
            setSupplierFilter('')
            setSituationFilter('all')
            setCustomMaturityRange(undefined)
            setMaturityPeriod('all')
            setMinValue('')
            setMaxValue('')
          }}
          hasActiveFilters={
            !!searchTerm ||
            !!supplierFilter ||
            situationFilter !== 'all' ||
            !!customMaturityRange ||
            !!minValue ||
            !!maxValue ||
            maturityPeriod !== 'all'
          }
        />
      </div>

      {selectedCompanyId && selectedCompanyId !== 'all' && (
        <div className="shrink-0">
          <PayablesCharts companyId={selectedCompanyId} filters={filters} />
        </div>
      )}

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="py-4 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Listagem de Obrigações</CardTitle>
            <CardDescription>
              {paginatedData?.count} registros encontrados.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 relative">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-full">
              <VirtualTable
                data={paginatedData?.data || []}
                columns={columns}
                rowHeight={55}
                visibleHeight="100%"
                onRowClick={setEditingItem}
                className="h-full border-0 rounded-none"
              />
            </div>
          )}
        </CardContent>
        <div className="shrink-0 border-t">
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Editar Obrigação' : 'Lançamento Manual'}
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <PayableForm
              initialData={editingItem}
              onSave={handleSaveEdit}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {selectedCompanyId && (
        <NotificationSettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          companyId={selectedCompanyId}
        />
      )}
    </div>
  )
}
