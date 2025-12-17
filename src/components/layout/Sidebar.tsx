import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Settings,
  Search,
  Menu,
  Wallet,
  Landmark,
  Users,
  FileSpreadsheet,
  UploadCloud,
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
import { useAuth } from '@/hooks/use-auth'

const baseMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Wallet, label: 'Fluxo de Caixa', path: '/fluxo-de-caixa' },
  { icon: Landmark, label: 'Saldos', path: '/saldos' },
  { icon: ArrowDownToLine, label: 'Contas a Receber', path: '/recebiveis' },
  { icon: ArrowUpFromLine, label: 'Contas a Pagar', path: '/pagaveis' },
  { icon: UploadCloud, label: 'Importações', path: '/importacoes' },
  {
    icon: FileSpreadsheet,
    label: 'Lançamentos extraordinários',
    path: '/ajustes',
  },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: Search, label: 'Auditoria', path: '/auditoria' },
]

export function Sidebar() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const { userProfile } = useAuth()

  // Filter menu items for User profile (remove Configurações)
  const menuItems = [...baseMenuItems]

  // Add specific items for administrators
  if (userProfile?.profile === 'Administrator') {
    // Add Settings and Users management for Admins
    menuItems.push({
      icon: Settings,
      label: 'Configurações',
      path: '/configuracoes',
    })

    // Insert "Usuários" after Settings
    const settingsIndex = menuItems.findIndex(
      (i) => i.path === '/configuracoes',
    )
    if (settingsIndex !== -1) {
      menuItems.splice(settingsIndex + 1, 0, {
        icon: Users,
        label: 'Usuários',
        path: '/configuracoes/usuarios',
      })
    }
  }

  const NavContent = () => (
    <div className="flex flex-col h-full py-4">
      <div className="px-6 mb-8 mt-2 flex items-center gap-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-md overflow-hidden bg-primary/5">
          <img
            src="https://img.usecurling.com/i?q=hospcom&color=blue&shape=fill"
            alt="Hospcom"
            className="h-full w-full object-contain p-1"
          />
        </div>
        <span className="font-bold text-xl tracking-tight text-primary">
          HospCash
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
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
              title={item.label.length > 25 ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              <span className="truncate">{item.label}</span>
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
