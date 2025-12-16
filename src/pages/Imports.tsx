import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function Imports() {
  const [isDragging, setIsDragging] = useState(false)

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
    toast.success('Arquivo recebido. Processando...')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Importação de Dados
        </h2>
        <p className="text-muted-foreground">
          Importe extratos bancários, OFX e planilhas.
        </p>
      </div>

      <Card
        className={`border-2 border-dashed transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-secondary p-4 mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Arraste e solte seu arquivo aqui
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Suporta CSV, XML, OFX e Excel. Tamanho máximo de 10MB.
          </p>
          <Button>Selecionar Arquivo</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Importações</CardTitle>
          <CardDescription>
            Visualize o status das últimas importações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">extrato_bancario_mai_2024.ofx</p>
                    <p className="text-sm text-muted-foreground">
                      Importado em 20/05/2024 às 14:30
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {i === 3 ? (
                    <span className="flex items-center text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Erro Parcial
                    </span>
                  ) : (
                    <span className="flex items-center text-sm text-success">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Sucesso
                    </span>
                  )}
                  <Button variant="ghost" size="sm">
                    Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
