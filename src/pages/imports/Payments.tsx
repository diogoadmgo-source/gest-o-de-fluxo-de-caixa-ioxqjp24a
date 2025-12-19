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
import { fetchPaginatedProductImports } from '@/services/product-imports'
import { supabase } from '@/lib/supabase/client'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { useAuth } from '@/hooks/use-auth'
import { useDebounce } from '@/hooks/use-debounce'
import { PaginationControl } from '@/components/common/PaginationControl'
import { ImportDialog } from '@/components/common/ImportDialog'

export default function Payments() {
  const { addImport, updateImport, deleteImport } = useProductImportStore()
  const { selectedCompanyId } = useCashFlowStore()
  const { user } = useAuth()

  const [pageSize, setPageSize] = useState(30)
  const [page, setPage] = useState(1)

  const [searchTerm, setSearchTerm] = useState('')
  const [editingItem, setEditingItem] = useState<Partial<ProductImport> | null>(
    null,
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const debouncedSearch = useDebounce(searchTerm, 400)

  const {
    data: paginatedData,
    isLoading,
    refetch,
  } = useQuery(
    `product-imports-payments-${selectedCompanyId}-${page}-${pageSize}-${debouncedSearch}`,
    async () => {
      if (!user) return { data: [], count: 0 }
      const visibleIds = await getVisibleCompanyIds(
        supabase,
        user.id,
        selectedCompanyId,
      )

      if (visibleIds.length === 0) return { data: [], count: 0 }

      return fetchPaginatedProductImports(visibleIds, page, pageSize, {
        search: debouncedSearch,
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

  const formatCurrency = (val: number, currency: string = 'USD') =>
    val.toLocaleString('pt-BR', { style: 'currency', currency })

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Pagamentos e Adiantamentos
          </h2>
          <p className="text-muted-foreground">
            Gestão financeira de importações, valores ao fornecedor e câmbio.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
          </Button>
          <Button onClick={() => setEditingItem({} as ProductImport)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col border shadow-sm">
        <CardHeader className="py-4 shrink-0 border-b bg-muted/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base">
                Registros de Pagamento
              </CardTitle>
              <CardDescription className="text-xs">
                {paginatedData?.count || 0} registros encontrados
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor, descrição..."
                className="pl-9 w-full sm:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto relative bg-background">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor (ME)</TableHead>
                <TableHead className="text-right">Taxa Câmbio</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
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
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.data.map((item) => {
                  const totalBRL =
                    item.foreign_currency_value * item.exchange_rate

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell
                        className="font-medium max-w-[200px] truncate"
                        title={item.description}
                      >
                        {item.description}
                      </TableCell>
                      <TableCell
                        className="max-w-[150px] truncate"
                        title={item.international_supplier}
                      >
                        {item.international_supplier}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(
                          item.foreign_currency_value,
                          item.foreign_currency_code,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.exchange_rate.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {formatCurrency(totalBRL, 'BRL')}
                      </TableCell>
                      <TableCell>
                        {item.start_date
                          ? format(parseISO(item.start_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.status}</Badge>
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
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Editar Lançamento' : 'Novo Lançamento'}
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
              Tem certeza que deseja excluir este registro?
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
        type="payments_advances"
        title="Importar Pagamentos e Adiantamentos"
        onImported={() => refetch()}
      />
    </div>
  )
}
