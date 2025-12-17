import { AdjustmentForm } from '@/components/adjustments/AdjustmentForm'
import { AdjustmentList } from '@/components/adjustments/AdjustmentList'

export default function Adjustments() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Correções e Lançamentos Extraordinários
        </h2>
        <p className="text-muted-foreground">
          Gerencie ajustes manuais e correções financeiras.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <AdjustmentForm />
        <AdjustmentList />
      </div>
    </div>
  )
}
