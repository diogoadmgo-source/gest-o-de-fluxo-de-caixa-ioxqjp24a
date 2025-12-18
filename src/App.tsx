import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CashFlowProvider } from '@/stores/useCashFlowStore'
import { ProductImportProvider } from '@/stores/useProductImportStore'
import { AuthProvider } from '@/hooks/use-auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import { Loader2 } from 'lucide-react'

// Code Splitting / Lazy Loading
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Receivables = React.lazy(() => import('./pages/Receivables'))
const Payables = React.lazy(() => import('./pages/Payables'))
const Reports = React.lazy(() => import('./pages/Reports'))
const Settings = React.lazy(() => import('./pages/Settings'))
const PerformanceReport = React.lazy(() => import('./pages/PerformanceReport'))
const NotFound = React.lazy(() => import('./pages/NotFound'))
// ... other pages as needed

const Loading = () => (
  <div className="h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <Route path="/login" element={<Login />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/recebiveis" element={<Receivables />} />
                  <Route path="/pagaveis" element={<Payables />} />
                  <Route path="/relatorios" element={<Reports />} />
                  <Route path="/configuracoes" element={<Settings />} />
                  <Route path="/performance" element={<PerformanceReport />} />
                </Route>
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
