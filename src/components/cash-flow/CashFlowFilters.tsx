import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter } from 'lucide-react'
import useCashFlowStore from '@/stores/useCashFlowStore'

export function CashFlowFilters() {
  const { companies, selectedCompanyId, setSelectedCompanyId } =
    useCashFlowStore()

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
          <div className="w-[240px]">
            <Select
              value={selectedCompanyId || 'all_branches'}
              onValueChange={(val) =>
                setSelectedCompanyId(val === 'all_branches' ? null : val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_branches">Todas as Filiais</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
