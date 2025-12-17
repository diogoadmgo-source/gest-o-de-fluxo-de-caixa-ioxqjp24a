import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExtraordinaryPayables } from '@/components/adjustments/ExtraordinaryPayables'
import { ExtraordinaryReceivables } from '@/components/adjustments/ExtraordinaryReceivables'
import { ExtraordinaryImports } from '@/components/adjustments/ExtraordinaryImports'
import { FileSpreadsheet, UploadCloud, ArrowDown, ArrowUp } from 'lucide-react'

export default function Adjustments() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Lançamentos Extraordinários
        </h2>
        <p className="text-muted-foreground">
          Gestão centralizada para criar, editar e excluir registros de forma
          manual e auditada.
        </p>
      </div>

      <Tabs defaultValue="payables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payables">
            <ArrowUp className="mr-2 h-4 w-4 text-destructive" />
            Contas a Pagar
          </TabsTrigger>
          <TabsTrigger value="receivables">
            <ArrowDown className="mr-2 h-4 w-4 text-success" />
            Contas a Receber
          </TabsTrigger>
          <TabsTrigger value="imports">
            <UploadCloud className="mr-2 h-4 w-4 text-blue-500" />
            Importações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payables">
          <ExtraordinaryPayables />
        </TabsContent>

        <TabsContent value="receivables">
          <ExtraordinaryReceivables />
        </TabsContent>

        <TabsContent value="imports">
          <ExtraordinaryImports />
        </TabsContent>
      </Tabs>
    </div>
  )
}
