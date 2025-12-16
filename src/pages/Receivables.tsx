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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { Receivable } from '@/lib/types'

export default function Receivables() {
  const { receivables, deleteReceivable, importData } = useCashFlowStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Enhanced Filtering
  const filteredData = receivables.filter((t) => {
    const term = searchTerm.toLowerCase()
    return (
      t.customer.toLowerCase().includes(term) ||
      t.invoice_number.toLowerCase().includes(term) ||
      t.order_number.toLowerCase().includes(term) ||
      t.company.toLowerCase().includes(term)
    )
  })

  const handleImport = () => {
    setIsImporting(true)
    setTimeout(() => {
      // Simulate import
      importData('receivable', [
        {
          customer: 'Cliente Importado',
          principal_value: 5000,
          due_date: format(new Date(), 'yyyy-MM-dd'),
        },
      ])

      setIsImporting(false)
      setIsImportDialogOpen(false)
      toast.success(
        'Importação concluída com sucesso! Registros atualizados e fluxo recalculado.',
      )
    }, 2000)
  }

  const handleDelete = (id: string) => {
    deleteReceivable(id)
    toast.success('Título removido com sucesso.')
  }

  const calculateUpdatedValue = (item: Receivable) => {
    return item.principal_value + item.fine + item.interest
  }

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
                  <p className="text-xs text-muted-foreground mt-2">
                    Colunas obrigatórias: Empresa, Data de Emissão, Nr do
                    Pedido, NF, Status, Código, Cliente, CNPJ/CPF, UF, Regional,
                    Vendedor, Parcela, Vencimento, Valores.
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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Manual
          </Button>
        </div>
      </div>

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
                  <TableHead>Emissão</TableHead>
                  <TableHead>Nr Pedido</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Vlr Principal</TableHead>
                  <TableHead className="text-right">Multa/Juros</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  const updatedTotal = calculateUpdatedValue(item)
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-xs">
                        {item.company}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.issue_date
                          ? format(parseISO(item.issue_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.order_number}
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
                      <TableCell className="text-xs text-center">
                        {item.installment}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.due_date
                          ? format(parseISO(item.due_date), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {item.principal_value.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {(item.fine + item.interest).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        {updatedTotal.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
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
                              onClick={() =>
                                toast.info(`Detalhes: ${item.invoice_number}`)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toast.info('Edição não implementada')
                              }
                            >
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
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
