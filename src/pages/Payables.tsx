import { useState, useMemo } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Upload,
  Copy,
  Download,
  FilePlus,
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'
import { Transaction } from '@/lib/types'
import { PayableForm } from '@/components/financial/PayableForm'
import { PayableStats } from '@/components/financial/PayableStats'
import { PayableFilters } from '@/components/financial/PayableFilters'
import { PayablesChart } from '@/components/financial/PayablesChart'
import {
  format,
  parseISO,
  isSameDay,
  addDays,
  startOfDay,
  endOfDay,
  differenceInDays,
} from 'date-fns'
import { ImportDialog } from '@/components/common/ImportDialog'
import { DateRange } from 'react-day-picker'

export default function Payables() {
  const { payables, updatePayable, deletePayable, addPayable } =
    useCashFlowStore()

  // Filters State
  const [searchTerm, setSearchTerm] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [situationFilter, setSituationFilter] = useState('all')
  const [maturityPeriod, setMaturityPeriod] = useState('all')
  const [customMaturityRange, setCustomMaturityRange] = useState<
    DateRange | undefined
  >()
  const [minValue, setMinValue] = useState('')
  const [maxValue, setMaxValue] = useState('')

  // UI State
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Transaction | null>(null)
  const [viewingItem, setViewingItem] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Selection State
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    const today = startOfDay(new Date())

    return payables
      .filter((t) => {
        // Exclude Paid/Cancelled (Focus on Pending Obligations)
        if (t.status === 'paid' || t.status === 'cancelled') return false

        // 1. Document
        if (
          searchTerm &&
          !t.document_number.toLowerCase().includes(searchTerm.toLowerCase())
        )
          return false

        // 2. Supplier
        if (
          supplierFilter &&
          !t.entity_name.toLowerCase().includes(supplierFilter.toLowerCase())
        )
          return false

        const dueDate = parseISO(t.due_date)

        // 3. Situation
        if (situationFilter !== 'all') {
          if (situationFilter === 'overdue' && dueDate >= today) return false
          if (situationFilter === 'due_today' && !isSameDay(dueDate, today))
            return false
          if (situationFilter === 'upcoming' && dueDate <= today) return false
        }

        // 4. Maturity Period
        if (maturityPeriod !== 'all') {
          if (maturityPeriod === 'today') {
            if (!isSameDay(dueDate, today)) return false
          } else if (maturityPeriod === '7_days') {
            const end = addDays(today, 7)
            if (dueDate < today || dueDate > end) return false
          } else if (maturityPeriod === '15_days') {
            const end = addDays(today, 15)
            if (dueDate < today || dueDate > end) return false
          } else if (maturityPeriod === '30_days') {
            const end = addDays(today, 30)
            if (dueDate < today || dueDate > end) return false
          } else if (
            maturityPeriod === 'custom' &&
            customMaturityRange?.from &&
            customMaturityRange?.to
          ) {
            if (
              dueDate < startOfDay(customMaturityRange.from) ||
              dueDate > endOfDay(customMaturityRange.to)
            )
              return false
          }
        }

        // 5. Value Range
        if (minValue && t.amount < parseFloat(minValue)) return false
        if (maxValue && t.amount > parseFloat(maxValue)) return false

        return true
      })
      .sort(
        (a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
      ) // Always sort by Due Date Ascending
  }, [
    payables,
    searchTerm,
    supplierFilter,
    situationFilter,
    maturityPeriod,
    customMaturityRange,
    minValue,
    maxValue,
  ])

  // --- Metrics Calculation ---
  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    let total = 0
    let overdue = 0
    let due7 = 0
    let due30 = 0
    let nextMaturityDate: string | null = null
    let nextMaturityValue = 0

    const next7 = addDays(today, 7)
    const next30 = addDays(today, 30)

    // Find next maturity date (first future date from sorted list)
    // List is already sorted by date asc. We just need the first one >= today
    const futureItems = filteredData.filter(
      (t) => parseISO(t.due_date) >= today,
    )
    if (futureItems.length > 0) {
      nextMaturityDate = futureItems[0].due_date
      nextMaturityValue = futureItems
        .filter((t) =>
          isSameDay(parseISO(t.due_date), parseISO(nextMaturityDate!)),
        )
        .reduce((sum, t) => sum + t.amount, 0)
    }

    filteredData.forEach((t) => {
      const d = parseISO(t.due_date)
      total += t.amount

      if (d < today) overdue += t.amount
      if (d >= today && d <= next7) due7 += t.amount
      if (d >= today && d <= next30) due30 += t.amount
    })

    return {
      totalToPay: total,
      overdue,
      dueIn7Days: due7,
      dueIn30Days: due30,
      nextMaturityDate,
      nextMaturityValue,
      totalCount: filteredData.length,
    }
  }, [filteredData])

  // --- Actions ---

  const handleClearFilters = () => {
    setSearchTerm('')
    setSupplierFilter('')
    setSituationFilter('all')
    setMaturityPeriod('all')
    setCustomMaturityRange(undefined)
    setMinValue('')
    setMaxValue('')
    toast.info('Filtros limpos.')
  }

  const handleDelete = () => {
    if (deletingId) {
      deletePayable(deletingId)
      toast.success('Obrigação removida com sucesso.')
      setDeletingId(null)
    }
  }

  const handleBulkDelete = () => {
    // Since store doesn't have bulk delete, we iterate
    // Ideally this should be a single transaction
    const ids = Array.from(selectedRows)
    ids.forEach((id) => deletePayable(id))
    toast.success(`${ids.length} obrigações removidas.`)
    setSelectedRows(new Set())
    setBulkDeleting(false)
  }

  const handleDuplicate = (item: Transaction) => {
    const { id, ...rest } = item
    // Create a copy, but let user edit it (especially dates)
    const copy = {
      ...rest,
      document_number: `${rest.document_number} (Cópia)`,
      description: `Cópia de ${rest.document_number}`,
      // Dates default to today for safety
      due_date: new Date().toISOString().split('T')[0],
      issue_date: new Date().toISOString().split('T')[0],
    }
    setEditingItem(copy as Transaction)
  }

  const handleSaveEdit = (updated: Transaction) => {
    if (updated.id) {
      updatePayable(updated)
      toast.success('Obrigação atualizada!')
    } else {
      addPayable(updated)
      toast.success('Nova obrigação criada!')
    }
    setEditingItem(null)
  }

  const handleExportCSV = () => {
    const itemsToExport =
      selectedRows.size > 0
        ? filteredData.filter((t) => selectedRows.has(t.id))
        : filteredData

    if (itemsToExport.length === 0) {
      toast.warning('Nada para exportar.')
      return
    }

    const headers = [
      'Empresa',
      'Fornecedor',
      'Documento',
      'Emissão',
      'Vencimento',
      'Principal',
      'Multa',
      'Juros',
      'Total',
      'Categoria',
      'Descrição',
    ]

    const csvContent = [
      headers.join(';'),
      ...itemsToExport.map((t) =>
        [
          t.company_id, // Ideally company name, but ID is what we have on object directly
          t.entity_name,
          t.document_number,
          t.issue_date,
          t.due_date,
          (t.principal_value || 0).toFixed(2).replace('.', ','),
          (t.fine || 0).toFixed(2).replace('.', ','),
          (t.interest || 0).toFixed(2).replace('.', ','),
          t.amount.toFixed(2).replace('.', ','),
          t.category,
          t.description || '',
        ].join(';'),
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'contas_a_pagar.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredData.length && filteredData.length > 0) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredData.map((t) => t.id)))
    }
  }

  const toggleRow = (id: string) => {
    const newSet = new Set(selectedRows)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedRows(newSet)
  }

  const getSituationBadge = (dueDateStr: string) => {
    const today = startOfDay(new Date())
    const due = parseISO(dueDateStr)
    const days = differenceInDays(due, today)

    if (days < 0) {
      return (
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-800 hover:bg-red-200 border-transparent whitespace-nowrap"
        >
          Vencido ({Math.abs(days)}d)
        </Badge>
      )
    } else if (days === 0) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap"
        >
          Vence Hoje
        </Badge>
      )
    } else {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-50 text-blue-700 border-blue-100 whitespace-nowrap"
        >
          A vencer ({days}d)
        </Badge>
      )
    }
  }

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const hasActiveFilters =
    !!searchTerm ||
    !!supplierFilter ||
    situationFilter !== 'all' ||
    maturityPeriod !== 'all' ||
    !!minValue ||
    !!maxValue

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

      <PayableStats {...stats} />

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
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <PayablesChart data={filteredData} />

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listagem de Obrigações</CardTitle>
              <CardDescription>
                {filteredData.length} registros encontrados.
              </CardDescription>
            </div>
            {selectedRows.size > 0 && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-right-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8"
                >
                  <Download className="mr-2 h-3 w-3" />
                  Exportar ({selectedRows.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleting(true)}
                  className="h-8"
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Excluir ({selectedRows.size})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        selectedRows.size === filteredData.length &&
                        filteredData.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right text-muted-foreground text-xs">
                    Principal
                  </TableHead>
                  <TableHead className="text-right text-muted-foreground text-xs">
                    Multa
                  </TableHead>
                  <TableHead className="text-right text-muted-foreground text-xs">
                    Juros
                  </TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                  <TableHead className="text-right w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Nenhuma obrigação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(item.id)}
                          onCheckedChange={() => toggleRow(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        {item.document_number}
                      </TableCell>
                      <TableCell
                        className="text-sm max-w-[200px] truncate"
                        title={item.entity_name}
                      >
                        {item.entity_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(item.due_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{getSituationBadge(item.due_date)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(item.principal_value || item.amount)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(item.fine || 0)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(item.interest || 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm">
                        {formatCurrency(item.amount)}
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
                              onClick={() => setViewingItem(item)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setEditingItem(item)}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(item)}
                            >
                              <Copy className="mr-2 h-4 w-4" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
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
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Editar Obrigação' : 'Lançamento Manual'}
            </DialogTitle>
            <CardDescription className="text-xs">
              Preencha os dados da conta a pagar.
            </CardDescription>
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

      <Dialog
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Obrigação</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="font-semibold text-muted-foreground">
                  Fornecedor:
                </span>
                <span className="font-medium">{viewingItem.entity_name}</span>

                <span className="font-semibold text-muted-foreground">
                  Documento:
                </span>
                <span>{viewingItem.document_number}</span>

                <span className="font-semibold text-muted-foreground">
                  Emissão:
                </span>
                <span>
                  {format(parseISO(viewingItem.issue_date), 'dd/MM/yyyy')}
                </span>

                <span className="font-semibold text-muted-foreground">
                  Vencimento:
                </span>
                <span>
                  {format(parseISO(viewingItem.due_date), 'dd/MM/yyyy')}
                </span>

                <span className="font-semibold text-muted-foreground">
                  Categoria:
                </span>
                <span>{viewingItem.category}</span>

                <span className="col-span-2 border-t my-1"></span>

                <span className="font-semibold text-muted-foreground">
                  Principal:
                </span>
                <span>
                  {formatCurrency(
                    viewingItem.principal_value || viewingItem.amount,
                  )}
                </span>

                <span className="font-semibold text-muted-foreground">
                  Multa:
                </span>
                <span>{formatCurrency(viewingItem.fine || 0)}</span>

                <span className="font-semibold text-muted-foreground">
                  Juros:
                </span>
                <span>{formatCurrency(viewingItem.interest || 0)}</span>

                <span className="font-bold text-foreground">Total:</span>
                <span className="font-bold">
                  {formatCurrency(viewingItem.amount)}
                </span>

                <span className="col-span-2 border-t my-1"></span>

                <span className="font-semibold text-muted-foreground">
                  Descrição:
                </span>
                <span className="col-span-2 text-xs bg-muted p-2 rounded">
                  {viewingItem.description || '-'}
                </span>

                <span className="font-semibold text-muted-foreground mt-2">
                  Criado em:
                </span>
                <span className="mt-2 text-xs text-muted-foreground">
                  {viewingItem.created_at
                    ? format(
                        parseISO(viewingItem.created_at),
                        'dd/MM/yyyy HH:mm',
                      )
                    : '-'}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Single Confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Obrigação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente este registro.
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog
        open={bulkDeleting}
        onOpenChange={(open) => !open && setBulkDeleting(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {selectedRows.size} Itens?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir {selectedRows.size} obrigações
              selecionadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Exclusão em Massa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
