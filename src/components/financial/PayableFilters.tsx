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

interface PayableFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  supplier: string
  setSupplier: (value: string) => void
  situation: string
  setSituation: (value: string) => void
  maturityPeriod: string
  setMaturityPeriod: (value: string) => void
  customMaturityRange: DateRange | undefined
  setCustomMaturityRange: (range: DateRange | undefined) => void
  minValue: string
  setMinValue: (value: string) => void
  maxValue: string
  setMaxValue: (value: string) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function PayableFilters({
  searchTerm,
  setSearchTerm,
  supplier,
  setSupplier,
  situation,
  setSituation,
  maturityPeriod,
  setMaturityPeriod,
  customMaturityRange,
  setCustomMaturityRange,
  minValue,
  setMinValue,
  maxValue,
  setMaxValue,
  onClearFilters,
  hasActiveFilters,
}: PayableFiltersProps) {
  return (
    <div className="space-y-4 bg-muted/20 p-4 rounded-lg border border-border/40">
      <div className="flex flex-col xl:flex-row gap-4 flex-wrap">
        {/* Search Document */}
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs mb-1.5 block text-muted-foreground">
            Documento
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documento..."
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Supplier */}
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs mb-1.5 block text-muted-foreground">
            Fornecedor
          </Label>
          <Input
            placeholder="Nome do fornecedor"
            className="bg-background"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </div>

        {/* Situation */}
        <div className="w-full sm:w-[180px]">
          <Label className="text-xs mb-1.5 block text-muted-foreground">
            Situação
          </Label>
          <Select value={situation} onValueChange={setSituation}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="due_today">Vence Hoje</SelectItem>
              <SelectItem value="upcoming">A Vencer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Maturity Period */}
        <div className="w-full sm:w-[220px]">
          <Label className="text-xs mb-1.5 block text-muted-foreground">
            Período de Vencimento
          </Label>
          <Select value={maturityPeriod} onValueChange={setMaturityPeriod}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo Período</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7_days">Próximos 7 Dias</SelectItem>
              <SelectItem value="15_days">Próximos 15 Dias</SelectItem>
              <SelectItem value="30_days">Próximos 30 Dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Range Picker - Only shows if 'custom' is selected */}
        {maturityPeriod === 'custom' && (
          <div>
            <Label className="text-xs mb-1.5 block text-muted-foreground">
              Intervalo Personalizado
            </Label>
            <DateRangePicker
              date={customMaturityRange}
              setDate={setCustomMaturityRange}
              placeholder="Selecione as datas"
              className="w-full sm:w-[260px]"
            />
          </div>
        )}

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
