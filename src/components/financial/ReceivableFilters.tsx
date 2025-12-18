import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { X, Filter, Search } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DateRange } from 'react-day-picker'

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
  return (
    <div className="space-y-4 bg-muted/20 p-4 rounded-lg border border-border/40">
      <div className="flex flex-col xl:flex-row gap-4 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[250px]">
          <Label className="text-xs mb-1.5 block text-muted-foreground">
            Buscar
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, NF ou pedido..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Status */}
        <div className="w-full sm:w-[180px]">
          <Label className="text-xs mb-1.5 block text-muted-foreground">
            Status
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="a_vencer">A Vencer</SelectItem>
              <SelectItem value="vencida">Vencida</SelectItem>
              <SelectItem value="Liquidado">Liquidado</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Due Date */}
        <div>
          <Label className="text-xs mb-1.5 block text-muted-foreground">
            Vencimento
          </Label>
          <DateRangePicker
            date={dueDateRange}
            setDate={setDueDateRange}
            placeholder="Período de Vencimento"
            className="w-full sm:w-[260px]"
          />
        </div>

        {/* Issue Date */}
        <div>
          <Label className="text-xs mb-1.5 block text-muted-foreground">
            Emissão
          </Label>
          <DateRangePicker
            date={issueDateRange}
            setDate={setIssueDateRange}
            placeholder="Período de Emissão"
            className="w-full sm:w-[260px]"
          />
        </div>

        {/* Created At (Batch Audit) */}
        <div>
          <Label className="text-xs mb-1.5 block text-muted-foreground">
            Importação / Criação
          </Label>
          <DateRangePicker
            date={createdAtRange}
            setDate={setCreatedAtRange}
            placeholder="Período de Criação"
            className="w-full sm:w-[260px]"
          />
        </div>

        {/* Value Range (Min/Max) */}
        <div>
          <Label className="text-xs mb-1.5 block text-muted-foreground">
            Valor (R$)
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full sm:w-[140px] justify-between ${
                  minValue || maxValue
                    ? 'text-primary border-primary/50 bg-primary/5'
                    : 'text-muted-foreground'
                }`}
              >
                {minValue || maxValue
                  ? `${minValue || '0'} - ${maxValue || '∞'}`
                  : 'Filtrar Valor'}
                <Filter className="h-3 w-3 ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Faixa de Valor</h4>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="minVal">Mínimo</Label>
                    <Input
                      id="minVal"
                      type="number"
                      placeholder="0.00"
                      className="col-span-2 h-8"
                      value={minValue}
                      onChange={(e) => setMinValue(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="maxVal">Máximo</Label>
                    <Input
                      id="maxVal"
                      type="number"
                      placeholder="0.00"
                      className="col-span-2 h-8"
                      value={maxValue}
                      onChange={(e) => setMaxValue(e.target.value)}
                    />
                  </div>
                  {(minValue || maxValue) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 w-full"
                      onClick={() => {
                        setMinValue('')
                        setMaxValue('')
                      }}
                    >
                      Limpar Valores
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <Button
              variant="ghost"
              onClick={onClearFilters}
              className="h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
