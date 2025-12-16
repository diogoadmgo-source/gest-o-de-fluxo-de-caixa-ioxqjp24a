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
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { toast } from 'sonner'

export default function Payables() {
  const { payables, deletePayable } = useCashFlowStore()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredData = payables.filter(
    (t) =>
      t.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.document_number.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDelete = (id: string) => {
    deletePayable(id)
    toast.success('Pagamento removido com sucesso.')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contas a Pagar</h2>
          <p className="text-muted-foreground">
            Controle seus pagamentos e despesas.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Plus className="mr-2 h-4 w-4" />
              Novo Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Pagamento</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="supplier" className="text-right">
                  Fornecedor
                </Label>
                <Input id="supplier" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Valor
                </Label>
                <Input id="amount" type="number" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Vencimento
                </Label>
                <Input id="date" type="date" className="col-span-3" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                <TableHead>Valor</TableHead>
                <TableHead>Categoria</TableHead>
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
                  <TableCell>
                    {item.amount.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
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
                        <DropdownMenuItem
                          onClick={() => toast.info('Ver detalhes')}
                        >
                          <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info('Editar')}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(item.id)}
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
    </div>
  )
}
