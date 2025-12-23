import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import {
  X,
  ListFilter,
  Search,
  Calendar,
  DollarSign,
  Tag,
  CircleDollarSign,
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'

interface ReceivableFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  status: string
  setStatus: (value: string) => void
  dueDateRange: DateRange | undefined
  setDueDateRange: (range: DateRange | undefined) => void
  issueDateRange: DateRange | undefined
  setIssueDateRange: (range: DateRange | undefined) => void
  createdAtRange: DateRange | undefined
  setCreatedAtRange: (range: DateRange | undefined) => void
  minValue: string
  setMinValue: (value: string) => void
  maxValue: string
  setMaxValue: (value: string) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function ReceivableFilters({
  searchTerm,
  setSearchTerm,
  status,
  setStatus,
  dueDateRange,
  setDueDateRange,
  issueDateRange,
  setIssueDateRange,
  createdAtRange,
  setCreatedAtRange,
  minValue,
  setMinValue,
  maxValue,
  setMaxValue,
  onClearFilters,
  hasActiveFilters,
}: ReceivableFiltersProps) {
  // Calculate active filters count for the badge
  const activeCount = [
    status !== 'all',
    !!dueDateRange,
    !!issueDateRange,
    !!createdAtRange,
    !!minValue || !!maxValue,
  ].filter(Boolean).length

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center bg-card p-1.5 rounded-lg border shadow-sm">
      {/* Consolidated Search Input */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por cliente, nota fiscal, pedido ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 border-none shadow-none focus-visible:ring-0 bg-transparent h-10 text-base md:text-sm"
        />
      </div>

      <div className="hidden sm:block">
        <Separator orientation="vertical" className="h-6" />
      </div>

      {/* Filter Trigger */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end px-2 sm:px-0">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-2 border-dashed border-input hover:border-accent-foreground/50 transition-colors',
                activeCount > 0 &&
                  'bg-secondary/50 border-solid border-secondary-foreground/20 text-secondary-foreground',
              )}
            >
              <ListFilter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              <span className="sm:hidden">Opções</span>
              {activeCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 min-w-[20px] justify-center rounded-full text-[10px] ml-0.5 bg-background text-foreground border shadow-sm"
                >
                  {activeCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[340px] p-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-semibold text-sm">Filtros Avançados</h4>
                {activeCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
                    onClick={onClearFilters}
                  >
                    Limpar tudo
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" /> Status
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="a_vencer">A Vencer</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                    <SelectItem value="Liquidado">Liquidado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Value Range */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2 text-muted-foreground">
                  <CircleDollarSign className="h-3.5 w-3.5" /> Valor (R$)
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">
                      Min
                    </span>
                    <Input
                      type="number"
                      placeholder="0,00"
                      className="h-9 pl-9"
                      value={minValue}
                      onChange={(e) => setMinValue(e.target.value)}
                    />
                  </div>
                  <span className="text-muted-foreground">-</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">
                      Max
                    </span>
                    <Input
                      type="number"
                      placeholder="∞"
                      className="h-9 pl-9"
                      value={maxValue}
                      onChange={(e) => setMaxValue(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Dates Group */}
              <div className="space-y-3 pt-2 border-t">
                {/* Due Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Vencimento
                  </Label>
                  <DateRangePicker
                    date={dueDateRange}
                    setDate={setDueDateRange}
                    placeholder="Qualquer data"
                    className="w-full"
                  />
                </div>

                {/* Issue Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Emissão
                  </Label>
                  <DateRangePicker
                    date={issueDateRange}
                    setDate={setIssueDateRange}
                    placeholder="Qualquer data"
                    className="w-full"
                  />
                </div>

                {/* Created At */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Criação / Importação
                  </Label>
                  <DateRangePicker
                    date={createdAtRange}
                    setDate={setCreatedAtRange}
                    placeholder="Qualquer data"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearFilters}
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Limpar filtros"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
