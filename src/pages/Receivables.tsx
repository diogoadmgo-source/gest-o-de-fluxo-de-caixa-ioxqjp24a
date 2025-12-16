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
  Filter,
  MoreHorizontal,
  Upload,
  FileSpreadsheet,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { Receivable } from '@/lib/types'
import { FinancialStats } from '@/components/financial/FinancialStats'
import { ReceivableForm } from '@/components/financial/ReceivableForm'

export default function Receivables() {
  const { receivables, updateReceivable, deleteReceivable, importData } =
    useCashFlowStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'Aberto' | 'Liquidado'
  >('all')
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [editingItem, setEditingItem] = useState<Receivable | null>(null)
  const [viewingItem, setViewingItem] = useState<Receivable | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Enhanced Filtering
  const filteredData = receivables.filter((t) => {
    const term = searchTerm.toLowerCase()
    const matchesTerm =
      t.customer.toLowerCase().includes(term) ||
      t.invoice_number.toLowerCase().includes(term) ||
      t.order_number.toLowerCase().includes(term) ||
      t.company.toLowerCase().includes(term)

    const matchesStatus =
      statusFilter === 'all' || t.title_status === statusFilter

    return matchesTerm && matchesStatus
  })

  // Calculations for Dashboard
  const openReceivables = receivables.filter((r) => r.title_status === 'Aberto')
  const liquidatedReceivables = receivables.filter(
    (r) => r.title_status === 'Liquidado',
  )

  const sumValues = (items: Receivable[]) =>
    items.reduce(
      (acc, curr) => ({
        principal: acc.principal + curr.principal_value,
        fine: acc.fine + curr.fine,
        interest: acc.interest + curr.interest,
        total: acc.total + curr.updated_value,
      }),
      { principal: 0, fine: 0, interest: 0, total: 0 },
    )

  const openStats = sumValues(openReceivables)
  const liquidatedStats = sumValues(liquidatedReceivables)

  // Total Geral = Aberto + Liquidado (as requested)
  const totalStats = {
    principal: openStats.principal + liquidatedStats.principal,
    fine: openStats.fine + liquidatedStats.fine,
    interest: openStats.interest + liquidatedStats.interest,
    total: openStats.total + liquidatedStats.total,
  }

  const handleImport = () => {
    setIsImporting(true)
    setTimeout(() => {
      importData('receivable', [
        {
          customer: 'Cliente Importado',
          principal_value: 5000,
          fine: 0,
          interest: 0,
          due_date: format(new Date(), 'yyyy-MM-dd'),
          invoice_number: 'IMP-001',
          title_status: 'Aberto',
        },
      ])

      setIsImporting(false)
      setIsImportDialogOpen(false)
      toast.success(
        'Importação concluída! Registros atualizados e fluxo recalculado.',
      )
    }, 2000)
  }

  const handleDelete = () => {
    if (deletingId) {
      deleteReceivable(deletingId)
      toast.success('Título removido (marcado como inativo) com sucesso.')
      setDeletingId(null)
    }
  }

  const handleSaveEdit = (updated: Receivable) => {
    updateReceivable(updated)
    setEditingItem(null)
    toast.success('Título atualizado com sucesso!')
  }

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Contas a Receber
          </h2>
          <p className="text-muted-foreground">
            Gestão detalhada de títulos e importação de dados.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Importar Títulos
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Importar Contas a Receber</DialogTitle>
                <DialogDescription>
                  Faça upload de arquivo CSV ou XML seguindo o layout padrão.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">
                    Arraste seu arquivo aqui ou clique para selecionar
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? 'Processando...' : 'Importar Arquivo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setEditingItem({} as Receivable)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Manual
          </Button>
        </div>
      </div>

      <FinancialStats
        stats={[
          {
            label: 'Total Geral',
            ...totalStats,
            color: 'primary',
            icon: Briefcase,
            onClick: () => {
              setStatusFilter('all')
              toast.info('Exibindo todos os títulos.')
            },
          },
          {
            label: 'Total Aberto',
            ...openStats,
            color: 'custom-red', // Using custom key for specific styling logic
            icon: AlertCircle,
            onClick: () => {
              setStatusFilter('Aberto')
              toast.info('Filtrando por títulos em aberto.')
            },
          },
          {
            label: 'Total Liquidado',
            ...liquidatedStats,
            color: 'custom-green', // Using custom key
            icon: CheckCircle2,
            onClick: () => {
              setStatusFilter('Liquidado')
              toast.info('Filtrando por títulos liquidados.')
            },
          },
        ]}
      />

      {statusFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Filtro Ativo: {statusFilter}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="text-xs h-6"
          >
            Limpar Filtro
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listagem de Títulos</CardTitle>
              <CardDescription>
                Visualização consolidada de recebíveis.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, NF ou pedido..."
                  className="pl-9 w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Multa</TableHead>
                  <TableHead className="text-right">Juros</TableHead>
                  <TableHead className="text-right font-bold">
                    Atualizado
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Nenhum título encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-xs">
                        {item.company}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.invoice_number}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.title_status === 'Liquidado'
                              ? 'default'
                              : 'secondary'
                          }
                          className={
                            item.title_status === 'Liquidado'
                              ? 'bg-success hover:bg-success/80 text-[10px]'
                              : 'text-[10px]'
                          }
                        >
                          {item.title_status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate text-xs"
                        title={item.customer}
                      >
                        {item.customer}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.due_date
                          ? format(parseISO(item.due_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(item.principal_value)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(item.fine)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(item.interest)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        {formatCurrency(item.updated_value)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setViewingItem(item)}
                            >
                              <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                            </DropdownMenuItem>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Editar Título' : 'Novo Título'}
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <ReceivableForm
              initialData={editingItem}
              onSave={handleSaveEdit}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Título</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="font-semibold">Cliente:</span>
                <span>{viewingItem.customer}</span>
                <span className="font-semibold">NF:</span>
                <span>{viewingItem.invoice_number}</span>
                <span className="font-semibold">Valor Principal:</span>
                <span>{formatCurrency(viewingItem.principal_value)}</span>
                <span className="font-semibold">Valor Atualizado:</span>
                <span className="font-bold">
                  {formatCurrency(viewingItem.updated_value)}
                </span>
                <span className="font-semibold">Status:</span>
                <span>{viewingItem.title_status}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará o título como excluído e o removerá da
              visualização principal.
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
    </div>
  )
}
