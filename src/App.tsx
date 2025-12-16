import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import Receivables from './pages/Receivables'
import Payables from './pages/Payables'
import Imports from './pages/Imports'
import Reports from './pages/Reports'
import PeriodClosing from './pages/PeriodClosing'
import ManualAdjustments from './pages/ManualAdjustments'
import Settings from './pages/Settings'
import Audit from './pages/Audit'

const App = () => (
  <BrowserRouter
    future={{ v7_startTransition: false, v7_relativeSplatPath: false }}
  >
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recebiveis" element={<Receivables />} />
          <Route path="/pagaveis" element={<Payables />} />
          <Route path="/importacoes" element={<Imports />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/fechamento" element={<PeriodClosing />} />
          <Route path="/ajustes" element={<ManualAdjustments />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/auditoria" element={<Audit />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
