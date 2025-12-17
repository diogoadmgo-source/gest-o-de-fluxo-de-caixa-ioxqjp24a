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
  CheckCircle,
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
}

export function ImportDialog({
  open,
  onOpenChange,
  type,
  title,
}: ImportDialogProps) {
  const { importData } = useCashFlowStore()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    success: boolean
    message: string
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
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Por favor, utilize arquivos CSV para importação.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo excede o tamanho máximo de 10MB.')
      return
    }

    setSelectedFile(file)
    setResult(null)
    toast.success(`Arquivo "${file.name}" validado com sucesso.`)
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

  const handleImport = async () => {
    if (!selectedFile) return
    setIsProcessing(true)
    setProgress(10)
    setResult(null)

    try {
      const text = await selectedFile.text()
      setProgress(30)

      const parsedData = parseCSV(text)
      setProgress(50)

      if (type === 'receivable' || type === 'payable') {
        const res = await importData(type, parsedData, selectedFile.name)
        setResult(res)

        if (res.success) {
          toast.success(res.message)
        } else {
          toast.warning(res.message)
        }
      }

      setProgress(100)
    } catch (error: any) {
      console.error(error)
      setResult({
        success: false,
        message: 'Erro ao ler arquivo: ' + error.message,
      })
      toast.error('Erro ao processar arquivo.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Faça upload de arquivo CSV seguindo o layout padrão.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
                accept=".csv,.txt"
                onChange={handleFileSelect}
              />
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">
                Arraste seu arquivo CSV aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Suporta apenas arquivos CSV
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
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
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Processando registros...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>

              {result && (
                <Alert
                  variant={result.success ? 'default' : 'destructive'}
                  className={cn(
                    result.success &&
                      'border-success bg-success/10 text-success',
                  )}
                >
                  {result.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {result.success ? 'Sucesso' : 'Atenção'}
                  </AlertTitle>
                  <AlertDescription className="max-h-24 overflow-y-auto text-xs mt-1">
                    {result.message}
                  </AlertDescription>
                </Alert>
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
            {isProcessing ? 'Processando...' : 'Importar Arquivo'}
            {!isProcessing && <Play className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
