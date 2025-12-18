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
  CheckCircle2,
  Eye,
  Database,
} from 'lucide-react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { cn, parseCSV } from '@/lib/utils'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ImportRejectsDialog } from '@/components/financial/ImportRejectsDialog'

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
  const { importData, selectedCompanyId, companies } = useCashFlowStore()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    stats?: {
      records: number
      importedTotal: number
      fileTotal?: number
      fileTotalPrincipal?: number
      failuresTotal?: number
      duplicatesSkipped?: number
      batchId?: string
      rejectedRows?: number
      rejectedAmount?: number
      auditDbRows?: number
      auditDbValue?: number
    }
  } | null>(null)
  const [showRejects, setShowRejects] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedCompanyName = companies.find(
    (c) => c.id === selectedCompanyId,
  )?.name

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
      'Empresa',
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
      'Minha Empresa;12345;PED-001;Cliente Exemplo;00.000.000/0001-00;01/01/2025;01/02/2025;1.500,00;Aberto;Exemplo'

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
      toast.error('Selecione uma empresa antes de prosseguir.')
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
        // Enforce company ID usage from context
        const res = await importData(
          type,
          parsedData,
          selectedFile.name,
          (percent) => {
            const overallProgress = 50 + Math.round((percent * 50) / 100)
            setProgress(overallProgress)
          },
        )
        setResult(res)

        if (res.success) {
          const count = res.stats?.records || 0
          const rejected = res.stats?.rejectedRows || 0
          let msg = `Importação concluída! ${count} registros inseridos.`
          if (rejected > 0) {
            msg += ` (${rejected} rejeitados/duplicados)`
          }
          toast.success(msg)

          onImported?.()
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

  const showWarning = type === 'receivable'
  const hasRejects =
    result?.stats?.batchId && (result?.stats?.rejectedRows || 0) > 0

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!isProcessing) {
            onOpenChange(val)
            if (!val) {
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

          {/* Governance / Context Check */}
          {!selectedCompanyId || selectedCompanyId === 'all' ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Seleção Obrigatória</AlertTitle>
              <AlertDescription>
                Por favor, selecione uma empresa no menu principal antes de
                iniciar a importação.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {showWarning && (
                <Alert
                  variant="destructive"
                  className="py-2 bg-destructive/5 border-destructive/20 text-destructive"
                >
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertTitle className="text-sm font-semibold">
                    Substituição Total: {selectedCompanyName}
                  </AlertTitle>
                  <AlertDescription className="text-xs text-destructive/90">
                    Esta importação <strong>substituirá todos</strong> os
                    títulos existentes para a empresa selecionada. A operação é
                    irreversível.
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
                      <div className="space-y-3 animate-fade-in">
                        <Alert
                          variant="default"
                          className="border-green-500/50 bg-green-500/10 text-green-700"
                        >
                          <Info className="h-4 w-4 text-green-600" />
                          <AlertTitle>Importação Concluída</AlertTitle>
                          <AlertDescription className="text-xs mt-1">
                            {result.message}
                          </AlertDescription>
                        </Alert>

                        {/* Verification Stats */}
                        <div className="rounded-md border p-4 bg-card text-card-foreground shadow-sm space-y-4">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            Resumo da Operação
                          </h4>
                          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                            {/* File Total */}
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-xs uppercase tracking-wider">
                                Total Planilha
                              </span>
                              <span className="font-medium text-base">
                                {(
                                  result.stats?.fileTotalPrincipal || 0
                                ).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                            </div>

                            {/* Rejected / Not Imported */}
                            <div className="flex flex-col">
                              <span className="text-destructive text-xs uppercase tracking-wider font-semibold">
                                Não Importado
                              </span>
                              <span className="font-bold text-base text-destructive">
                                {(
                                  result.stats?.rejectedAmount || 0
                                ).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                            </div>

                            {/* Imported Total */}
                            <div className="flex flex-col border-t pt-2 col-span-2">
                              <span className="text-emerald-600 text-xs uppercase tracking-wider font-bold">
                                Total Importado
                              </span>
                              <div className="flex justify-between items-end">
                                <span className="font-bold text-xl text-emerald-700">
                                  {(
                                    result.stats?.importedTotal || 0
                                  ).toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })}
                                </span>
                                <span className="text-xs text-muted-foreground mb-1">
                                  {result.stats?.records} registros
                                </span>
                              </div>
                            </div>

                            {/* Post-Import Audit Check */}
                            {result.stats?.auditDbValue !== undefined && (
                              <div className="flex flex-col border-t border-dashed pt-2 col-span-2">
                                <span className="text-xs uppercase tracking-wider font-semibold flex items-center gap-1 text-muted-foreground">
                                  <Database className="h-3 w-3" />
                                  Auditoria Pós-Importação (DB)
                                </span>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-sm font-medium">
                                    {(
                                      result.stats.auditDbValue || 0
                                    ).toLocaleString('pt-BR', {
                                      style: 'currency',
                                      currency: 'BRL',
                                    })}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {result.stats.auditDbRows} total no banco
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {result.stats?.rejectedRows ? (
                            <div className="mt-2 text-xs text-destructive flex items-center gap-1 font-medium bg-destructive/5 p-2 rounded">
                              <AlertCircle className="h-3 w-3" />
                              {result.stats.rejectedRows} registros rejeitados
                              ou duplicados.
                            </div>
                          ) : null}

                          {hasRejects && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => setShowRejects(true)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes dos Rejeitados
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Fechar
            </Button>
            {!result?.success &&
              selectedCompanyId &&
              selectedCompanyId !== 'all' && (
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || isProcessing}
                >
                  {isProcessing ? 'Importando...' : 'Confirmar Importação'}
                  {!isProcessing && <Play className="ml-2 h-4 w-4" />}
                </Button>
              )}
          </div>
        </DialogContent>
      </Dialog>

      <ImportRejectsDialog
        batchId={result?.stats?.batchId || null}
        open={showRejects}
        onOpenChange={setShowRejects}
      />
    </>
  )
}
