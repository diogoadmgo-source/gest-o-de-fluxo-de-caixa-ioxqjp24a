import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Input } from '@/components/ui/input'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { ImportLogForm } from '@/components/adjustments/ImportLogForm'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { ImportHistoryEntry } from '@/lib/types'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'

export function ExtraordinaryImports() {
  const { importHistory, addImportLog, updateImportLog, deleteImportLog } =
    useCashFlowStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingItem, setEditingItem] = useState<ImportHistoryEntry | null>(
    null,
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredData = importHistory.filter((t) =>
    t.filename.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSave = async (data: ImportHistoryEntry) => {
    if (data.id) {
      await updateImportLog(data)
    } else {
      await addImportLog(data)
    }
    setEditingItem(null)
  }

  const handleDelete = async () => {
    if (deletingId) {
      await deleteImportLog(deletingId)
      toast.success('Log excluído com sucesso.')
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por arquivo..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setEditingItem({} as ImportHistoryEntry)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Log Manual
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Importações</CardTitle>
          <CardDescription>
            Gerencie manualmente os registros de importação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Registros</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.filename}</TableCell>
                    <TableCell>
                      {item.created_at
                        ? format(parseISO(item.created_at), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 'success' ? 'default' : 'destructive'
                        }
                        className={
                          item.status === 'success' ? 'bg-success' : ''
                        }
                      >
                        {item.status === 'success' ? 'Sucesso' : 'Erro'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.records_count}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/90"
                          onClick={() => setDeletingId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Editar Log' : 'Novo Log Manual'}
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <ImportLogForm
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
              Tem certeza que deseja excluir este registro? Esta ação será
              auditada.
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
