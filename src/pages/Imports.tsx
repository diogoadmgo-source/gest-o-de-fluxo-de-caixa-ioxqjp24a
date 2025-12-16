import { useState, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FileSpreadsheet,
  X,
  Play,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { format } from 'date-fns'

export default function Imports() {
  const { importData } = useCashFlowStore()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importType, setImportType] = useState('receivable')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      validateAndSetFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (file: File) => {
    // Basic validation
    if (
      !file.name.endsWith('.csv') &&
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.ofx')
    ) {
      toast.error('Formato de arquivo não suportado. Use CSV, Excel ou OFX.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo excede o tamanho máximo de 10MB.')
      return
    }

    setSelectedFile(file)
    toast.success(`Arquivo "${file.name}" anexado com sucesso.`)
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleImport = () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setProgress(0)

    // Simulating file processing and validation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)

          // Trigger the import in the store
          const mockData = [
            {
              description: 'Importado',
              amount: 1500,
              due_date: format(new Date(), 'yyyy-MM-dd'),
            },
            {
              description: 'Importado 2',
              amount: 2500,
              due_date: format(new Date(), 'yyyy-MM-dd'),
            },
          ]

          if (importType === 'receivable' || importType === 'payable') {
            importData(importType as any, mockData)
          }

          setIsProcessing(false)
          toast.success(
            'Importação concluída! Registros processados e dashboard atualizado.',
          )
          setSelectedFile(null)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Importação de Dados
        </h2>
        <p className="text-muted-foreground">
          Importe extratos bancários, OFX e planilhas de gestão.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nova Importação</CardTitle>
              <CardDescription>
                Selecione o tipo de arquivo e faça o upload.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Dados</Label>
                <Select value={importType} onValueChange={setImportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receivable">Contas a Receber</SelectItem>
                    <SelectItem value="payable">Contas a Pagar</SelectItem>
                    <SelectItem value="bank_statement">
                      Extrato Bancário (OFX/CSV)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {importType === 'receivable' &&
                    'Campos obrigatórios: Documento, Cliente, Vencimento, Valor.'}
                  {importType === 'payable' &&
                    'Campos obrigatórios: Documento, Fornecedor, Vencimento, Valor, Categoria.'}
                </p>
              </div>

              {!selectedFile ? (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all',
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv,.xlsx,.ofx"
                    onChange={handleFileSelect}
                  />
                  <div className="rounded-full bg-secondary p-4 mb-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">
                    Clique ou arraste o arquivo aqui
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Suporta CSV, XML, OFX e Excel.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Processando registros...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {!isProcessing && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={removeFile}>
                        Cancelar
                      </Button>
                      <Button onClick={handleImport}>
                        <Play className="mr-2 h-4 w-4" />
                        Validar e Importar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico Recente</CardTitle>
              <CardDescription>Status das últimas importações</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    {i === 3 ? (
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {i === 1
                          ? 'contas_receber_mai.csv'
                          : i === 2
                            ? 'extrato_itau_abr.ofx'
                            : 'pagamentos_jun.xlsx'}
                      </p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>
                          {i === 1 ? 'Hoje' : i === 2 ? 'Ontem' : '20/05/2024'}
                        </span>
                        <span>
                          {i === 3 ? 'Erro de Validação' : 'Concluído'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
