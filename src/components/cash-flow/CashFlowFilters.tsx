import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Filter, Search, Download } from 'lucide-react'

export function CashFlowFilters() {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="w-[180px]">
            <Select defaultValue="current_month">
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Este Mês</SelectItem>
                <SelectItem value="next_month">Próximo Mês</SelectItem>
                <SelectItem value="last_month">Mês Passado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px]">
            <Select defaultValue="all_branches">
              <SelectTrigger>
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_branches">Todas as Filiais</SelectItem>
                <SelectItem value="matriz">Matriz</SelectItem>
                <SelectItem value="sp">Filial SP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px]">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="op">Operacional</SelectItem>
                <SelectItem value="fin">Financeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>
    </div>
  )
}
