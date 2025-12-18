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
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { cn, parseCSV } from '@/lib/utils'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

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
  const { importData } = useCashFlowStore()
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
    }
    failures?: {
      document: string
      value: number
      reason: string
      line: number
    }[]
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
    setProgress(0)
    setResult(null)

    try {
      if (selectedFile.name.endsWith('.xlsx')) {
        toast.error(
          'A leitura de arquivos .xlsx requer processamento adicional não disponível neste ambiente. Converta para CSV.',
        )
        setIsProcessing(false)
        return
      }

      const text = await selectedFile.text()
      setProgress(5)

      const parsedData = parseCSV(text)
      setProgress(10)

      if (type === 'receivable' || type === 'payable') {
        const res = await importData(
          type,
          parsedData,
          selectedFile.name,
          (percent) => {
            const overallProgress = 10 + Math.round((percent * 90) / 100)
            setProgress(overallProgress)
          },
        )
        setResult(res)

        if (res.success && (!res.failures || res.failures.length === 0)) {
          toast.success('Importação concluída com sucesso.')
          onImported?.()
        } else {
          // If partial success or error
          if (res.success) {
            toast.warning('Importação parcial. Verifique os avisos.')
          } else {
            toast.error('Falha na importação.')
          }
        }
      }

      setProgress(100)
    } catch (error: any) {
      console.error(error)
      setResult({
        success: false,
        message: 'Erro ao processar arquivo: ' + error.message,
      })
      toast.error('Falha na importação.')
      removeFile()
    } finally {
      setIsProcessing(false)
    }
  }

  const showWarning = type === 'receivable' || type === 'payable'
  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Integrity Check Logic:
  // Diff = | (FileTotal - FailuresTotal) - ImportedTotal |
  const isIntegrityOk = (stats: any) => {
    const expected = (stats.fileTotal || 0) - (stats.failuresTotal || 0)
    const diff = Math.abs(expected - (stats.importedTotal || 0))
    return diff < 0.1
  }

  const isPrincipalIntegrityOk = (stats: any) => {
    if (!stats.fileTotalPrincipal) return true
    // Use failuresTotal as approximation for Principal Failure Value
    const expected =
      (stats.fileTotalPrincipal || 0) - (stats.failuresTotal || 0)
    const diff = Math.abs(expected - (stats.importedPrincipal || 0))
    // Looser tolerance for Principal as failure value might differ
    return diff < 2.0
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Faça upload de arquivo CSV ou XLSX.
          </DialogDescription>
        </DialogHeader>

        {showWarning && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">
              Atenção: Sobrescrita de Dados
            </AlertTitle>
            <AlertDescription className="text-xs">
              A importação de{' '}
              {type === 'receivable' ? 'contas a receber' : 'contas a pagar'}{' '}
              substituirá TODOS os títulos existentes para as empresas
              identificadas no arquivo. Certifique-se de que o arquivo contém a
              base completa.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-2">
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
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
              />
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">
                Arraste seu arquivo aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Suporta CSV e XLSX
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
                <div className="space-y-2">
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

                  {result.stats && (
                    <div className="rounded-md bg-muted p-3 text-sm grid gap-1">
                      <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">
                        Resumo da Integridade
                      </p>
                      <div className="flex justify-between">
                        <span>Registros Importados:</span>
                        <span className="font-mono">
                          {result.stats.records}
                        </span>
                      </div>

                      {/* Principal Value Check Section */}
                      {result.stats.importedPrincipal !== undefined && (
                        <>
                          <div className="my-1 border-t border-dashed" />
                          <div className="flex justify-between font-medium">
                            <span>Valor Principal (Arquivo):</span>
                            <span className="font-mono">
                              {formatCurrency(
                                result.stats.fileTotalPrincipal || 0,
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Valor Principal (Importado):</span>
                            <span
                              className={cn(
                                'font-mono',
                                isPrincipalIntegrityOk(result.stats)
                                  ? 'text-success'
                                  : 'text-destructive',
                              )}
                            >
                              {formatCurrency(
                                result.stats.importedPrincipal || 0,
                              )}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="my-1 border-t border-dashed" />

                      <div className="flex justify-between">
                        <span>Valor Total no Arquivo (Bruto):</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">
                          {formatCurrency(result.stats.fileTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor Rejeitado (Falhas):</span>
                        <span className="font-mono text-destructive">
                          {formatCurrency(result.stats.failuresTotal || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor Total Importado (Líquido):</span>
                        <span
                          className={cn(
                            'font-mono font-bold',
                            isIntegrityOk(result.stats)
                              ? 'text-success'
                              : 'text-destructive',
                          )}
                        >
                          {formatCurrency(result.stats.importedTotal)}
                        </span>
                      </div>
                      {!isIntegrityOk(result.stats) && (
                        <p className="text-destructive text-xs mt-1 font-semibold">
                          Divergência não explicada pelas falhas! Verifique o
                          log de erros.
                        </p>
                      )}
                    </div>
                  )}

                  {result.failures && result.failures.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2 text-destructive">
                        Registros com Falha ({result.failures.length})
                      </h4>
                      <ScrollArea className="h-[200px] border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[80px]">Linha</TableHead>
                              <TableHead>Documento</TableHead>
                              <TableHead className="text-right">
                                Valor
                              </TableHead>
                              <TableHead>Motivo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.failures.map((f, i) => (
                              <TableRow key={i}>
                                <TableCell>{f.line}</TableCell>
                                <TableCell className="font-medium">
                                  {f.document}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(f.value)}
                                </TableCell>
                                <TableCell className="text-red-500 text-xs">
                                  {f.reason}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  )}
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
              !selectedFile ||
              isProcessing ||
              (!!result &&
                result.success &&
                (!result.failures || result.failures.length === 0))
            }
            variant={showWarning ? 'destructive' : 'default'}
          >
            {isProcessing
              ? 'Processando...'
              : showWarning
                ? 'Sobrescrever e Importar'
                : 'Importar Arquivo'}
            {!isProcessing && <Play className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
