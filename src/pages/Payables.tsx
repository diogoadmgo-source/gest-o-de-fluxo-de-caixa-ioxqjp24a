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
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
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
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'
import { Transaction } from '@/lib/types'
import { PayableForm } from '@/components/financial/PayableForm'
import { FinancialStats } from '@/components/financial/FinancialStats'
import { format, parseISO } from 'date-fns'

export default function Payables() {
  const { payables, updatePayable, deletePayable } = useCashFlowStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingItem, setEditingItem] = useState<Transaction | null>(null)
  const [viewingItem, setViewingItem] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredData = payables.filter(
    (t) =>
      t.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.document_number.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calculations for Mini-Dashboard
  const pendingPayables = payables.filter(
    (p) => p.status === 'pending' || p.status === 'overdue',
  )
  const paidPayables = payables.filter((p) => p.status === 'paid')

  const sumValues = (items: Transaction[]) =>
    items.reduce(
      (acc, curr) => ({
        principal: acc.principal + (curr.principal_value || curr.amount),
        fine: acc.fine + (curr.fine || 0),
        interest: acc.interest + (curr.interest || 0),
        total: acc.total + curr.amount,
      }),
      { principal: 0, fine: 0, interest: 0, total: 0 },
    )

  const pendingStats = sumValues(pendingPayables)
  const paidStats = sumValues(paidPayables)

  const handleDelete = () => {
    if (deletingId) {
      deletePayable(deletingId)
      toast.success('Pagamento removido com sucesso.')
      setDeletingId(null)
    }
  }

  const handleSaveEdit = (updated: Transaction) => {
    updatePayable(updated)
    setEditingItem(null)
    toast.success('Pagamento atualizado com sucesso!')
  }

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contas a Pagar</h2>
          <p className="text-muted-foreground">
            Controle seus pagamentos e despesas.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setEditingItem({} as Transaction)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Pagamento
        </Button>
      </div>

      <FinancialStats
        stats={[
          {
            label: 'Total a Pagar',
            ...pendingStats,
            color: 'destructive',
            icon: AlertCircle,
          },
          {
            label: 'Total Pago',
            ...paidStats,
            color: 'success',
            icon: CheckCircle2,
          },
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listagem de Obrigações</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as contas a pagar.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar fornecedor ou documento..."
                  className="pl-9 w-[250px]"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Multa</TableHead>
                <TableHead className="text-right">Juros</TableHead>
                <TableHead className="text-right font-bold">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {item.document_number}
                  </TableCell>
                  <TableCell>{item.entity_name}</TableCell>
                  <TableCell>
                    {new Date(item.due_date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {formatCurrency(item.principal_value || item.amount)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatCurrency(item.fine || 0)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatCurrency(item.interest || 0)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs">
                    {formatCurrency(item.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === 'paid'
                          ? 'default'
                          : item.status === 'overdue'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className={
                        item.status === 'paid'
                          ? 'bg-success hover:bg-success/80'
                          : ''
                      }
                    >
                      {item.status === 'paid'
                        ? 'Pago'
                        : item.status === 'overdue'
                          ? 'Vencido'
                          : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingItem(item)}>
                          <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingItem(item)}>
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
              ))}
            </TableBody>
          </Table>
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
              {editingItem?.id ? 'Editar Pagamento' : 'Novo Pagamento'}
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

      {/* View Dialog */}
      <Dialog
        open={!!viewingItem}
        onOpenChange={(open) => !open && setViewingItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="font-semibold">Fornecedor:</span>
                <span>{viewingItem.entity_name}</span>
                <span className="font-semibold">Documento:</span>
                <span>{viewingItem.document_number}</span>
                <span className="font-semibold">Valor Principal:</span>
                <span>
                  {formatCurrency(
                    viewingItem.principal_value || viewingItem.amount,
                  )}
                </span>
                <span className="font-semibold">Valor Total:</span>
                <span className="font-bold">
                  {formatCurrency(viewingItem.amount)}
                </span>
                <span className="font-semibold">Status:</span>
                <span>{viewingItem.status}</span>
                <span className="font-semibold">Vencimento:</span>
                <span>
                  {format(parseISO(viewingItem.due_date), 'dd/MM/yyyy')}
                </span>
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
              Esta ação marcará o pagamento como excluído e o removerá da
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
