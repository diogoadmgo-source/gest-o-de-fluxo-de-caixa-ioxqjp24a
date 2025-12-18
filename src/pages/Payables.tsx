import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FilePlus, Upload, Trash2, Edit, Loader2 } from 'lucide-react'
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
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns'
import { ImportDialog } from '@/components/common/ImportDialog'
import { VirtualTable, VirtualTableColumn } from '@/components/ui/virtual-table'
import { useQuery } from '@/hooks/use-query'
import { fetchPaginatedPayables } from '@/services/financial'
import { useDebounce } from '@/hooks/use-debounce'
import { usePerformanceMeasure } from '@/lib/performance'

export default function Payables() {
  const { selectedCompanyId, updatePayable, addPayable, deletePayable } =
    useCashFlowStore()
  const perf = usePerformanceMeasure('/pagaveis', 'render')

  // Filters State
  const [pageSize] = useState(200)
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

  // Fetching
  const {
    data: paginatedData,
    isLoading,
    refetch,
  } = useQuery(
    `payables-${selectedCompanyId}-${page}-${debouncedSearch}-${debouncedSupplier}-${situationFilter}-${JSON.stringify(customMaturityRange)}`,
    () => {
      if (!selectedCompanyId || selectedCompanyId === 'all')
        return Promise.resolve({ data: [], count: 0 })

      return fetchPaginatedPayables(selectedCompanyId, page, pageSize, {
        search: debouncedSearch,
        supplier: debouncedSupplier,
        status: situationFilter,
        dateRange: customMaturityRange,
      })
    },
    {
      enabled: !!selectedCompanyId && selectedCompanyId !== 'all',
      staleTime: 60000,
    },
  )

  // Finish measure
  if (!isLoading) perf.end({ count: paginatedData?.count })

  // UI State
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Transaction | null>(null)

  const stats = useMemo(() => {
    return {
      totalToPay: 0,
      overdue: 0,
      dueIn7Days: 0,
      dueIn30Days: 0,
      nextMaturityDate: null,
      nextMaturityValue: 0,
      totalCount: paginatedData?.count || 0,
    }
  }, [paginatedData])

  const handleSaveEdit = (updated: Transaction) => {
    if (updated.id) {
      updatePayable(updated)
      toast.success('Obrigação atualizada!')
    } else {
      addPayable(updated)
      toast.success('Nova obrigação criada!')
    }
    setEditingItem(null)
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir?')) return
    await deletePayable(id)
    toast.success('Excluído')
    refetch()
  }

  const getSituationBadge = (dueDateStr: string) => {
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
      cell: (item) => getSituationBadge(item.due_date),
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
    <div className="space-y-6 animate-fade-in pb-2 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contas a Pagar</h2>
          <p className="text-muted-foreground">
            Gestão de obrigações pendentes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>

          <ImportDialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
            type="payable"
            title="Importar Contas a Pagar"
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

      <div className="shrink-0">
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
          }}
          hasActiveFilters={
            !!searchTerm ||
            !!supplierFilter ||
            situationFilter !== 'all' ||
            !!customMaturityRange
          }
        />
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="py-4 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Listagem de Obrigações</CardTitle>
            <CardDescription>
              {paginatedData?.count} registros encontrados.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
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
        <div className="p-2 border-t text-xs text-muted-foreground text-center shrink-0">
          Mostrando {paginatedData?.data.length} de {paginatedData?.count}{' '}
          registros (Página {page})
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
    </div>
  )
}
