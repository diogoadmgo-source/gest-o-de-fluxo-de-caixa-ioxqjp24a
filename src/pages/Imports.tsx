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
import { Badge } from '@/components/ui/badge'
import { Plus, Search, MoreHorizontal, Trash2, Edit } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, parseISO } from 'date-fns'
import useProductImportStore from '@/stores/useProductImportStore'
import { ProductImport } from '@/lib/types'
import { ProductImportForm } from '@/components/imports/ProductImportForm'
import { useQuery } from '@/hooks/use-query'
import { getVisibleCompanyIds } from '@/services/financial'
import { fetchPaginatedProductImports } from '@/services/product-imports'
import { supabase } from '@/lib/supabase/client'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { useAuth } from '@/hooks/use-auth'
import { useDebounce } from '@/hooks/use-debounce'
import { PaginationControl } from '@/components/common/PaginationControl'

export default function Imports() {
  const { addImport, updateImport, deleteImport } = useProductImportStore()
  const { selectedCompanyId } = useCashFlowStore()
  const { user } = useAuth()

  // Pagination State (AC 1, 2)
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editingItem, setEditingItem] = useState<Partial<ProductImport> | null>(
    null,
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(searchTerm, 400)

  // Server-side fetching with pagination and filters
  const {
    data: paginatedData,
    isLoading,
    refetch,
  } = useQuery(
    `product-imports-${selectedCompanyId}-${page}-${pageSize}-${debouncedSearch}-${statusFilter}`,
    async () => {
      if (!user) return { data: [], count: 0 }
      // Resolve company IDs visible to user
      const visibleIds = await getVisibleCompanyIds(
        supabase,
        user.id,
        selectedCompanyId,
      )

      if (visibleIds.length === 0) return { data: [], count: 0 }

      return fetchPaginatedProductImports(visibleIds, page, pageSize, {
        search: debouncedSearch,
        status: statusFilter,
      })
    },
    {
      enabled: !!user,
      staleTime: 60000,
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

  const formatCurrency = (val: number, currency: string = 'BRL') =>
    val.toLocaleString('pt-BR', { style: 'currency', currency })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Importações</h2>
          <p className="text-muted-foreground">
            Gestão de processos de importação de produtos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEditingItem({} as ProductImport)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Processos de Importação</CardTitle>
              <CardDescription>
                Lista de importações em andamento.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Pending">Pendente</SelectItem>
                  <SelectItem value="In Transit">Em Trânsito</SelectItem>
                  <SelectItem value="Customs">Alfândega</SelectItem>
                  <SelectItem value="Cleared">Desembaraçado</SelectItem>
                  <SelectItem value="Completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar fornecedor, processo..."
                  className="pl-9 w-full sm:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Processo</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor (ME)</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : !paginatedData || paginatedData.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.data.map((item) => {
                  const totalBRL =
                    item.foreign_currency_value * item.exchange_rate +
                    (item.logistics_costs || 0) +
                    (item.taxes || 0) +
                    (item.nationalization_costs || 0)

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {item.process_number || '-'}
                      </TableCell>
                      <TableCell>{item.international_supplier}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          item.foreign_currency_value,
                          item.foreign_currency_code,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totalBRL)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.expected_arrival_date
                          ? format(
                              parseISO(item.expected_arrival_date),
                              'dd/MM/yyyy',
                            )
                          : '-'}
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
                  )
                })
              )}
            </TableBody>
          </Table>
          <div className="mt-4">
            <PaginationControl
              currentPage={page}
              totalCount={paginatedData?.count || 0}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Editar Importação' : 'Nova Importação'}
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
              Tem certeza que deseja excluir esta importação? Esta ação não pode
              ser desfeita.
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
    </div>
  )
}
