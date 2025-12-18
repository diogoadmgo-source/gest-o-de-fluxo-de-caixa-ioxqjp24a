import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CashFlowProvider } from '@/stores/useCashFlowStore'
import { ProductImportProvider } from '@/stores/useProductImportStore'
import { AuthProvider } from '@/hooks/use-auth'
import Layout from '@/components/Layout'
import { Loader2 } from 'lucide-react'

// Code Splitting / Lazy Loading
const Login = React.lazy(() => import('@/pages/Login'))
const Dashboard = React.lazy(() => import('@/pages/Dashboard'))
const CashFlow = React.lazy(() => import('@/pages/CashFlow'))
const Receivables = React.lazy(() => import('@/pages/Receivables'))
const Payables = React.lazy(() => import('@/pages/Payables'))
const Reports = React.lazy(() => import('@/pages/Reports'))
const Settings = React.lazy(() => import('@/pages/Settings'))
const PerformanceReport = React.lazy(() => import('@/pages/PerformanceReport'))
const NotFound = React.lazy(() => import('@/pages/NotFound'))

const Balances = React.lazy(() => import('@/pages/Balances'))
const Imports = React.lazy(() => import('@/pages/Imports'))
const Adjustments = React.lazy(() => import('@/pages/Adjustments'))
const Audit = React.lazy(() => import('@/pages/Audit'))
const Users = React.lazy(() => import('@/pages/settings/Users'))
const PeriodClosing = React.lazy(() => import('@/pages/PeriodClosing'))

const Loading = () => (
  <div className="h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
  </div>
)

const App = () => (
  <BrowserRouter
    future={{ v7_startTransition: false, v7_relativeSplatPath: false }}
  >
    <TooltipProvider>
      <AuthProvider>
        <CashFlowProvider>
          <ProductImportProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<Loading />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/fluxo-de-caixa" element={<CashFlow />} />
                  <Route path="/recebiveis" element={<Receivables />} />
                  <Route path="/pagaveis" element={<Payables />} />
                  <Route path="/saldos" element={<Balances />} />
                  <Route path="/importacoes" element={<Imports />} />
                  <Route path="/ajustes" element={<Adjustments />} />
                  <Route path="/relatorios" element={<Reports />} />
                  <Route path="/auditoria" element={<Audit />} />
                  <Route path="/fechamento" element={<PeriodClosing />} />

                  {/* Settings Routes */}
                  <Route path="/configuracoes" element={<Settings />} />
                  <Route path="/configuracoes/usuarios" element={<Users />} />
                  <Route path="/performance" element={<PerformanceReport />} />
                </Route>

                {/* Catch-all Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ProductImportProvider>
        </CashFlowProvider>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
