import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, Calendar as CalendarIcon } from 'lucide-react'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { addDays, startOfMonth, endOfMonth, addMonths } from 'date-fns'
import { DateRangePicker } from '@/components/common/DateRangePicker'

export function CashFlowFilters() {
  const {
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    dateRange,
    setDateRange,
  } = useCashFlowStore()

  const handlePeriodChange = (val: string) => {
    const today = new Date()
    switch (val) {
      case 'next_7':
        setDateRange({ from: today, to: addDays(today, 7) })
        break
      case 'next_30':
        setDateRange({ from: today, to: addDays(today, 30) })
        break
      case 'next_90':
        setDateRange({ from: today, to: addDays(today, 90) })
        break
      case 'current_month':
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) })
        break
      case 'next_month': {
        const nextM = addMonths(today, 1)
        setDateRange({ from: startOfMonth(nextM), to: endOfMonth(nextM) })
        break
      }
      default:
        // custom or other logic
        break
    }
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1 items-center">
          <div className="w-[240px]">
            <Select onValueChange={handlePeriodChange} defaultValue="next_30">
              <SelectTrigger>
                <SelectValue placeholder="Período de Projeção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next_7">Próximos 7 dias</SelectItem>
                <SelectItem value="next_30">Próximos 30 dias</SelectItem>
                <SelectItem value="next_90">Próximos 90 dias</SelectItem>
                <SelectItem value="current_month">Este Mês</SelectItem>
                <SelectItem value="next_month">Próximo Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <span className="text-muted-foreground text-sm font-medium">ou</span>

          <DateRangePicker
            date={dateRange}
            setDate={setDateRange}
            className="w-[260px]"
          />

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
                <SelectItem value="all_branches">Todas as Empresas</SelectItem>
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
