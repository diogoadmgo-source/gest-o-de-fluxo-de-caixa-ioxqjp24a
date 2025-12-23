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
  ImportResult,
} from '@/services/financial'
import { importProductImports } from '@/services/product-imports'
import { ImportResultView, translateReason } from './ImportResultView'

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
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedCompanyName = companies.find(
    (c) => c.id === selectedCompanyId,
  )?.name

  const handleFileSelect = (file: File) => {
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
        '\nP&P;BR-42428100;MINDRAY;Aguardando registro DI;NF 43349;4237.00;26/12/2025;19/12/2025;3500.00;737.00;4237.00;Concluído'
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
        '\n15/01/2025;Adiantamento de Fornecedor;China Supply Co;5000.00;Adiantamento;ADV-001'
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
        '\nMinha Empresa;12345;PED-001;Cliente Exemplo;00.000.000/0001-00;01/01/2025;01/02/2025;1.500,00;Aberto;Exemplo'
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
    if (
      !selectedFile ||
      !selectedCompanyId ||
      selectedCompanyId === 'all' ||
      !user
    )
      return
    setIsProcessing(true)
    setProgress(0)
    setResult(null)
    try {
      setProgress(10)
      let parsedData: any[] = []
      if (selectedFile.name.endsWith('.xlsx')) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        throw new Error(
          'Arquivos XLSX requerem conversão. Salve como CSV e tente novamente.',
        )
      } else {
        const text = await selectedFile.text()
        setProgress(30)
        parsedData = parseCSV(text)
      }
      if (parsedData.length === 0) throw new Error('O arquivo está vazio.')
      setProgress(50)

      let res: ImportResult
      const progressTimer = setInterval(
        () => setProgress((prev) => (prev >= 90 ? prev : prev + 10)),
        500,
      )
      try {
        if (type === 'receivable')
          res = await importarReceivables(
            user.id,
            parsedData,
            selectedCompanyId,
            selectedFile.name,
          )
        else if (type === 'payable')
          res = await importarPayables(user.id, parsedData, selectedCompanyId)
        else if (type === 'product_import')
          res = await importProductImports(
            user.id,
            selectedCompanyId,
            parsedData,
          )
        else if (type === 'payments_advances')
          res = await importarPaymentsAdvances(
            user.id,
            parsedData,
            selectedCompanyId,
            selectedFile.name,
          )
        else throw new Error('Tipo desconhecido')
      } finally {
        clearInterval(progressTimer)
      }
      setResult(res)
      setProgress(100)
      if (res.success) {
        toast.success(`Concluído! ${res.stats?.records || 0} registros.`)
        if (type !== 'product_import') recalculateCashFlow()
        onImported?.()
      } else {
        toast.error(res.message || 'Falha na importação.')
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Erro desconhecido',
        failures: [],
      })
      toast.error(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const hasRejects =
    result?.stats?.rejectedRows && result.stats.rejectedRows > 0
  const canExportRejects = Boolean(hasRejects && result?.stats?.batchId)

  return (
    <Dialog
      open={open}
      onOpenChange={(val) =>
        !isProcessing &&
        (onOpenChange(val),
        !val &&
          setTimeout(() => {
            setResult(null)
            setSelectedFile(null)
            setProgress(0)
          }, 300))
      }
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Faça upload de arquivo CSV para atualizar a base de dados.
          </DialogDescription>
        </DialogHeader>
        {!selectedCompanyId || selectedCompanyId === 'all' ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Seleção Obrigatória</AlertTitle>
            <AlertDescription>
              Selecione uma empresa antes de iniciar.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 py-2">
            {(type === 'receivable' || type === 'payable') && (
              <Alert
                variant="destructive"
                className="py-2 bg-destructive/5 border-destructive/20 text-destructive"
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">
                  Substituição Total: {selectedCompanyName}
                </AlertTitle>
                <AlertDescription className="text-xs">
                  Esta importação substituirá todos os títulos existentes.
                </AlertDescription>
              </Alert>
            )}
            {!selectedFile ? (
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                )}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  if (e.dataTransfer.files.length > 0)
                    handleFileSelect(e.dataTransfer.files[0])
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv,.xlsx,.txt"
                  onChange={(e) =>
                    e.target.files?.length &&
                    handleFileSelect(e.target.files[0])
                  }
                />
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm font-medium">
                  Clique ou arraste o arquivo
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
                      onClick={() => {
                        setSelectedFile(null)
                        setResult(null)
                        setProgress(0)
                        if (fileInputRef.current)
                          fileInputRef.current.value = ''
                      }}
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
                {result && (
                  <ImportResultView
                    result={result}
                    onExportRejects={handleExportRejects}
                    isExportingRejects={isExportingRejects}
                    canExportRejects={canExportRejects}
                  />
                )}
              </div>
            )}
          </div>
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
  )
}
