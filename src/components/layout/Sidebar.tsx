import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Upload,
  BarChart3,
  CalendarCheck,
  Settings,
  Search,
  Menu,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useState } from 'react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Wallet, label: 'Fluxo de Caixa', path: '/fluxo-de-caixa' },
  { icon: ArrowDownToLine, label: 'Contas a Receber', path: '/recebiveis' },
  { icon: ArrowUpFromLine, label: 'Contas a Pagar', path: '/pagaveis' },
  { icon: Upload, label: 'Importações', path: '/importacoes' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: CalendarCheck, label: 'Fechamento', path: '/fechamento' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
  { icon: Search, label: 'Auditoria', path: '/auditoria' },
]

export function Sidebar() {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const NavContent = () => (
    <div className="flex flex-col h-full py-4">
      <div className="px-6 mb-8 mt-2 flex items-center gap-3">
        <div className="h-10 w-10 flex items-center justify-center bg-white rounded-md shadow-sm border p-1">
          <img
            src="https://raw.githubusercontent.com/temos-ai/skip-assets/refs/heads/main/12247/e7a9b6c0-cd6a-4933-bf9c-297c554f6645.jpeg"
            alt="Hospcom"
            className="h-full w-full object-contain"
          />
        </div>
        <span className="font-bold text-xl tracking-tight text-primary">
          HospCash
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-6 mt-auto">
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">
            Status do Sistema
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-foreground">Operacional</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar h-screen fixed left-0 top-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-3 left-4 z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de Navegação</SheetTitle>
          </SheetHeader>
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
