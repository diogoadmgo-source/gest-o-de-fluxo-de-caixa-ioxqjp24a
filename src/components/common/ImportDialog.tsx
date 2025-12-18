import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FileSpreadsheet,
  X,
  Play,
  AlertCircle,
  AlertTriangle,
  Download,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { cn, parseCSV } from '@/lib/utils'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'receivable' | 'payable' | 'general'
  title: string
  onImported?: () => void
}

export function ImportDialog({
  open,
  onOpenChange,
  type,
  title,
  onImported,
}: ImportDialogProps) {
  const { importData, selectedCompanyId } = useCashFlowStore()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    stats?: {
      fileTotal: number
      importedTotal: number
      fileTotalPrincipal?: number
      importedPrincipal?: number
      records: number
      failuresTotal?: number
      duplicatesSkipped?: number
    }
  } | null>(null)
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
    const isCsv = file.name.endsWith('.csv') || file.name.endsWith('.txt')
    const isXlsx = file.name.endsWith('.xlsx')

    if (!isCsv && !isXlsx) {
      toast.error('Por favor, utilize arquivos CSV ou XLSX.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo excede o tamanho máximo de 10MB.')
      return
    }

    setSelectedFile(file)
    setResult(null)
    toast.info(`Arquivo "${file.name}" selecionado.`)
  }

  const removeFile = () => {
    setSelectedFile(null)
    setResult(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const downloadTemplate = () => {
    const headers = [
      'Nota Fiscal',
      'Pedido',
      'Cliente',
      'CNPJ',
      'Emissão',
      'Vencimento',
      'Valor',
      'Status',
      'Observações',
    ]
    const content =
      headers.join(';') +
      '\n' +
      '12345;PED-001;Empresa Exemplo S.A.;00.000.000/0001-00;01/01/2025;01/02/2025;1.500,00;Aberto;Exemplo de importação'

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'modelo_importacao.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = async () => {
    if (!selectedFile) return
    if (!selectedCompanyId || selectedCompanyId === 'all') {
      toast.error('Selecione uma empresa específica antes de importar.')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResult(null)

    try {
      // Step 1: Read File
      setProgress(10)
      let parsedData: any[] = []

      if (selectedFile.name.endsWith('.xlsx')) {
        // Limitation handling for XLSX within strict environment
        await new Promise((resolve) => setTimeout(resolve, 500))
        throw new Error(
          'O processamento de arquivos XLSX requer conversão prévia. Por favor, salve seu arquivo como CSV (separado por ponto e vírgula) e tente novamente.',
        )
      } else {
        const text = await selectedFile.text()
        setProgress(30)
        parsedData = parseCSV(text)
      }

      if (parsedData.length === 0) {
        throw new Error(
          'O arquivo está vazio ou não pôde ser lido corretamente.',
        )
      }

      setProgress(50)

      // Step 2: Send to Store/API
      if (type === 'receivable' || type === 'payable') {
        const res = await importData(
          type,
          parsedData,
          selectedFile.name,
          (percent) => {
            // Map inner progress (0-100) to remaining outer progress (50-100)
            const overallProgress = 50 + Math.round((percent * 50) / 100)
            setProgress(overallProgress)
          },
        )
        setResult(res)

        if (res.success) {
          const count = res.stats?.records || 0
          const duplicates = res.stats?.duplicatesSkipped || 0
          let msg = `Importação concluída! ${count} registros inseridos.`
          if (duplicates > 0) {
            msg += ` (${duplicates} duplicatas removidas)`
          }
          toast.success(msg)

          onImported?.()
          // Close immediately on success per requirement, slightly longer delay to read success message if desired
          // User Story says "visible ... toast ... dashboard refresh", not necessarily close immediately but close logic is here
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        } else {
          toast.error('Falha na importação. Verifique os erros.')
        }
      }

      setProgress(100)
    } catch (error: any) {
      console.error(error)
      setResult({
        success: false,
        message: error.message || 'Erro desconhecido na importação.',
      })
      toast.error(error.message || 'Falha na importação.')
    } finally {
      setIsProcessing(false)
    }
  }

  const showWarning = type === 'receivable' || type === 'payable'

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!isProcessing) {
          onOpenChange(val)
          if (!val) {
            // Reset on close
            setTimeout(() => {
              setResult(null)
              setSelectedFile(null)
              setProgress(0)
            }, 300)
          }
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Faça upload de arquivo CSV para atualizar a base de dados.
          </DialogDescription>
        </DialogHeader>

        {showWarning && (
          <Alert
            variant="destructive"
            className="py-2 bg-destructive/5 border-destructive/20 text-destructive"
          >
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-sm font-semibold">
              Modo de Substituição Total
            </AlertTitle>
            <AlertDescription className="text-xs text-destructive/90">
              A importação substituirá <strong>todos</strong> os títulos
              existentes desta empresa. Certifique-se que o arquivo contém a
              base completa atualizada.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-2">
          {!selectedFile ? (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all',
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
                accept=".csv,.xlsx,.txt"
                onChange={handleFileSelect}
              />
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">
                Clique para selecionar ou arraste o arquivo
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Suporta CSV (Excel via Salvar Como CSV)
              </p>
              <Button
                variant="link"
                size="sm"
                className="mt-4 h-auto p-0 text-xs text-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  downloadTemplate()
                }}
              >
                <Download className="mr-1 h-3 w-3" />
                Baixar modelo CSV
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-medium truncate max-w-[250px]">
                        {selectedFile.name}
                      </p>
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
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Processando...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>

              {result && !result.success && (
                <div className="space-y-2 animate-fade-in">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro na importação</AlertTitle>
                    <AlertDescription className="text-xs mt-1 font-medium">
                      {result.message}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {result && result.success && (
                <div className="space-y-2 animate-fade-in">
                  <Alert
                    variant="default"
                    className="border-green-500/50 bg-green-500/10 text-green-700"
                  >
                    <Info className="h-4 w-4 text-green-600" />
                    <AlertTitle>Sucesso</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      {result.message}
                      {result.stats && (
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs opacity-90">
                          <div>Registros: {result.stats.records}</div>
                          {result.stats.duplicatesSkipped ? (
                            <div>
                              Duplicatas: {result.stats.duplicatesSkipped}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Fechar
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              !selectedFile || isProcessing || (!!result && result.success)
            }
          >
            {isProcessing ? 'Importando...' : 'Confirmar Importação'}
            {!isProcessing && <Play className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
