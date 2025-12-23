import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ImportResult } from '@/services/financial'
import {
  CheckCircle2,
  Download,
  Info,
  Loader2,
  XOctagon,
  AlertCircle,
} from 'lucide-react'

interface ImportResultViewProps {
  result: ImportResult
  onExportRejects?: () => void
  isExportingRejects: boolean
  canExportRejects: boolean
}

export function translateReason(reason: string) {
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

export function ImportResultView({
  result,
  onExportRejects,
  isExportingRejects,
  canExportRejects,
}: ImportResultViewProps) {
  if (!result.success) {
    return (
      <div className="space-y-2 animate-fade-in">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro na importação</AlertTitle>
          <AlertDescription className="text-xs mt-1 font-medium">
            {result.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const failuresCount =
    result.failures?.length || result.stats?.rejectedRows || 0

  return (
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

      {(failuresCount > 0 || canExportRejects) && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-destructive flex items-center gap-2">
              <XOctagon className="h-4 w-4" />
              Erros Encontrados ({failuresCount})
            </h4>
            {canExportRejects && onExportRejects && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportRejects}
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
                {result.failures.map((f: any, idx: number) => (
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
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground pt-1 text-center italic">
                Corrija os erros no arquivo original e tente importar novamente.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
