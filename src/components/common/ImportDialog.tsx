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
  XOctagon,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { cn, parseCSV } from '@/lib/utils'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'
import {
  importarReceivables,
  importarPayables,
  importarPaymentsAdvances,
  fetchImportRejects,
} from '@/services/financial'
import { importProductImports } from '@/services/product-imports'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type:
    | 'receivable'
    | 'payable'
    | 'general'
    | 'product_import'
    | 'payments_advances'
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
  const { user } = useAuth()
  const { selectedCompanyId, companies, recalculateCashFlow } =
    useCashFlowStore()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExportingRejects, setIsExportingRejects] = useState(false)
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
    failures?: any[]
  } | null>(null)
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
    let headers: string[] = []
    let content = ''

    if (type === 'product_import') {
      headers = [
        'Linha',
        'Invoice',
        'Fornecedor',
        'Situação',
        'NF',
        'Saldo',
        'Vencimento',
        'Previsão Desembaraço',
        'Estimativa sem Imposto',
        'Incidência de ICMS',
        'Estimativa Valor Desembaraço Final',
        'Status Desembaraço',
      ]
      content =
        headers.join(';') +
        '\n' +
        'P&P;BR-42428100;MINDRAY;Aguardando registro DI;NF 43349;4237.00;26/12/2025;19/12/2025;3500.00;737.00;4237.00;Concluído'
    } else if (type === 'payments_advances') {
      headers = [
        'Data',
        'Descrição',
        'Fornecedor',
        'Valor',
        'Categoria',
        'Documento',
      ]
      content =
        headers.join(';') +
        '\n' +
        '15/01/2025;Adiantamento de Fornecedor;China Supply Co;5000.00;Adiantamento;ADV-001'
    } else {
      headers = [
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
      content =
        headers.join(';') +
        '\n' +
        'Minha Empresa;12345;PED-001;Cliente Exemplo;00.000.000/0001-00;01/01/2025;01/02/2025;1.500,00;Aberto;Exemplo'
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `modelo_importacao_${type}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportRejects = async () => {
    if (!result?.stats?.batchId) {
      toast.error('Não há lote de rejeitos disponível para exportação.')
      return
    }

    setIsExportingRejects(true)
    const toastId = toast.loading('Preparando exportação...')

    try {
      const batchId = result.stats.batchId
      let allRejects: any[] = []
      let page = 1
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const res = await fetchImportRejects(batchId, page, pageSize)
        if (res.data && res.data.length > 0) {
          allRejects = [...allRejects, ...res.data]
          if (res.data.length < pageSize) hasMore = false
          else page++
        } else {
          hasMore = false
        }
      }

      if (allRejects.length === 0) {
        toast.dismiss(toastId)
        toast.info('Nenhum registro rejeitado encontrado no banco de dados.')
        return
      }

      // Generate CSV
      const header = [
        'linha',
        'motivo',
        'invoice_number',
        'order_number',
        'customer',
        'due_date',
        'principal_value',
        'status',
        'installment',
        'raw_json',
      ].join(';')

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (
          str.includes(';') ||
          str.includes('"') ||
          str.includes('\n') ||
          str.includes('\r')
        ) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      const rows = allRejects
        .map((r) => {
          const raw = r.raw_data || {}
          return [
            r.row_number,
            translateReason(r.reason) || r.reason,
            escapeCsv(raw.invoice_number),
            escapeCsv(raw.order_number),
            escapeCsv(raw.customer),
            escapeCsv(raw.due_date),
            escapeCsv(raw.principal_value),
            escapeCsv(raw.title_status),
            escapeCsv(raw.installment),
            escapeCsv(JSON.stringify(raw)),
          ].join(';')
        })
        .join('\n')

      const csvContent = header + '\n' + rows

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const companyNameClean = selectedCompanyName
        ? selectedCompanyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        : 'empresa'
      link.setAttribute(
        'download',
        `rejeitados_recebiveis_${companyNameClean}_${batchId}.csv`,
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.dismiss(toastId)
      toast.success(`${allRejects.length} registros exportados com sucesso.`)
    } catch (error) {
      console.error(error)
      toast.dismiss(toastId)
      toast.error('Erro ao exportar rejeitos.')
    } finally {
      setIsExportingRejects(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return
    if (!selectedCompanyId || selectedCompanyId === 'all') {
      toast.error('Selecione uma empresa antes de prosseguir.')
      return
    }
    if (!user) {
      toast.error('Sessão expirada. Por favor, faça login novamente.')
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

      // Step 2: Send to Service
      let res

      // Simulate progress since RPC is atomic
      const progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + 10
        })
      }, 500)

      try {
        if (type === 'receivable') {
          res = await importarReceivables(
            user.id,
            parsedData,
            selectedCompanyId,
            selectedFile.name,
          )
        } else if (type === 'payable') {
          res = await importarPayables(user.id, parsedData, selectedCompanyId)
        } else if (type === 'product_import') {
          res = await importProductImports(
            user.id,
            selectedCompanyId,
            parsedData,
          )
        } else if (type === 'payments_advances') {
          res = await importarPaymentsAdvances(
            user.id,
            parsedData,
            selectedCompanyId,
            selectedFile.name,
          )
        } else {
          throw new Error('Tipo de importação desconhecido')
        }
      } finally {
        clearInterval(progressTimer)
      }

      setResult(res)
      setProgress(100)

      if (res.success) {
        const count = res.stats?.records || 0
        const rejected = res.stats?.rejectedRows || 0
        let msg = `Importação concluída! ${count} registros inseridos.`
        if (rejected > 0) {
          msg += ` (${rejected} rejeitados/duplicados)`
        }
        toast.success(msg)

        if (type !== 'product_import') recalculateCashFlow()
        onImported?.()
      } else {
        toast.error(res.message || 'Falha na importação.')
      }
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
  const hasRejects =
    result?.stats?.rejectedRows && result.stats.rejectedRows > 0
  const canExportRejects = hasRejects && result?.stats?.batchId

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

                        {/* Detailed Stats */}
                        <div className="rounded-md border p-4 bg-card text-card-foreground shadow-sm space-y-4">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            Resumo Detalhado
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="flex flex-col p-2 bg-muted/30 rounded">
                              <span className="text-xs text-muted-foreground font-medium uppercase">
                                Total Linhas
                              </span>
                              <span className="text-lg font-bold">
                                {result.stats?.fileTotal ||
                                  (result.stats?.records || 0) +
                                    (result.stats?.rejectedRows || 0)}
                              </span>
                            </div>
                            <div className="flex flex-col p-2 bg-emerald-50 rounded border border-emerald-100">
                              <span className="text-xs text-emerald-600 font-medium uppercase">
                                Sucesso
                              </span>
                              <span className="text-lg font-bold text-emerald-700">
                                {result.stats?.records}
                              </span>
                            </div>
                            <div className="flex flex-col p-2 bg-rose-50 rounded border border-rose-100">
                              <span className="text-xs text-rose-600 font-medium uppercase">
                                Rejeitados
                              </span>
                              <span className="text-lg font-bold text-rose-700">
                                {result.stats?.rejectedRows || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Failures List */}
                        {((result.failures && result.failures.length > 0) ||
                          canExportRejects) && (
                          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-destructive flex items-center gap-2">
                                <XOctagon className="h-4 w-4" />
                                Erros Encontrados (
                                {result.failures?.length ||
                                  result.stats?.rejectedRows}
                                )
                              </h4>
                              {canExportRejects && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleExportRejects}
                                  disabled={isExportingRejects}
                                  className="h-7 text-xs bg-white hover:bg-white/90 border-destructive/20 text-destructive hover:text-destructive"
                                >
                                  {isExportingRejects ? (
                                    <>
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      Exportando...
                                    </>
                                  ) : (
                                    <>
                                      <Download className="mr-1 h-3 w-3" />
                                      Exportar rejeitados
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            {result.failures && result.failures.length > 0 && (
                              <>
                                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                  {result.failures.map(
                                    (f: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="flex flex-col gap-1 text-xs text-muted-foreground border-b border-destructive/10 pb-2 last:border-0"
                                      >
                                        <div className="flex justify-between font-mono font-medium text-destructive/80">
                                          <span>Linha {f.row}</span>
                                          <span>{f.reason}</span>
                                        </div>
                                        <div className="bg-background/50 p-1 rounded font-mono text-[10px] truncate opacity-70">
                                          {JSON.stringify(f.data)}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground pt-1 text-center italic">
                                  Corrija os erros no arquivo original e tente
                                  importar novamente.
                                </p>
                              </>
                            )}
                          </div>
                        )}
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
    </>
  )
}

function translateReason(reason: string) {
  switch (reason) {
    case 'invoice_number_vazio':
      return 'Nota Fiscal vazia'
    case 'customer_vazio':
      return 'Cliente vazio'
    case 'valor_invalido':
      return 'Valor inválido'
    case 'data_vencimento_invalida':
      return 'Data Vencimento inválida'
    case 'parcela_formato_invalido':
      return 'Parcela inválida'
    case 'duplicado_lote':
      return 'Duplicado (Mesmo Lote)'
    case 'valor_negativo':
      return 'Valor Negativo'
    case 'valor_atualizado_negativo':
      return 'Valor Atualizado Negativo'
    case 'vencimento_menor_emissao':
      return 'Vencimento menor que Emissão'
    case 'linha_invalida':
      return 'Linha Inválida (Lixo/Total)'
    default:
      return reason
  }
}
