import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileBarChart, PieChart, TrendingUp, Download } from 'lucide-react'

export default function Reports() {
  const reports = [
    {
      title: 'Fluxo de Caixa Executivo',
      description: 'Visão consolidada para diretoria com KPIs principais.',
      icon: FileBarChart,
    },
    {
      title: 'Análise de Despesas',
      description: 'Detalhamento de gastos por centro de custo e categoria.',
      icon: PieChart,
    },
    {
      title: 'Projeção de Tendências',
      description: 'Análise preditiva baseada no histórico de 12 meses.',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Relatórios Gerenciais
        </h2>
        <p className="text-muted-foreground">
          Extraia insights para tomada de decisão.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card
            key={report.title}
            className="hover:shadow-md transition-all cursor-pointer group"
          >
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <report.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
              >
                <Download className="mr-2 h-4 w-4" />
                Gerar PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
