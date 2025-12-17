import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CashFlowProvider } from '@/stores/useCashFlowStore'
import { AuthProvider } from '@/hooks/use-auth'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import Receivables from './pages/Receivables'
import Payables from './pages/Payables'
import Reports from './pages/Reports'
import PeriodClosing from './pages/PeriodClosing'
import Settings from './pages/Settings'
import Audit from './pages/Audit'
import CashFlow from './pages/CashFlow'
import Balances from './pages/Balances'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Users from './pages/settings/Users'

const App = () => (
  <BrowserRouter
    future={{ v7_startTransition: false, v7_relativeSplatPath: false }}
  >
    <TooltipProvider>
      <AuthProvider>
        <CashFlowProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/fluxo-de-caixa" element={<CashFlow />} />
              <Route path="/saldos" element={<Balances />} />
              <Route path="/recebiveis" element={<Receivables />} />
              <Route path="/pagaveis" element={<Payables />} />
              {/* Importacoes removed */}
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/fechamento" element={<PeriodClosing />} />
              {/* /ajustes removed - logic moved to /configuracoes */}
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="/configuracoes/usuarios" element={<Users />} />
              <Route path="/auditoria" element={<Audit />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CashFlowProvider>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
