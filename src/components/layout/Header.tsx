import {
  Bell,
  User,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  Building,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocation, Link } from 'react-router-dom'
import useCashFlowStore from '@/stores/useCashFlowStore'
import { useAuth } from '@/hooks/use-auth'

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/':
      return 'Dashboard'
    case '/fluxo-de-caixa':
      return 'Fluxo de Caixa'
    case '/saldos':
      return 'Gestão de Saldos'
    case '/recebiveis':
      return 'Contas a Receber'
    case '/pagaveis':
      return 'Contas a Pagar'
    case '/importacoes':
      return 'Importações'
    case '/relatorios':
      return 'Relatórios'
    case '/fechamento':
      return 'Fechamento de Período'
    case '/configuracoes':
      return 'Configurações'
    case '/configuracoes/usuarios':
      return 'Gestão de Usuários'
    case '/auditoria':
      return 'Auditoria'
    case '/ajustes':
      return 'Ajustes Manuais'
    default:
      return 'HospCash'
  }
}

export function Header() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)
  const { companies, selectedCompanyId, setSelectedCompanyId } =
    useCashFlowStore()
  const { userProfile, signOut } = useAuth()

  // Changed to sticky to avoid overlapping content
  return (
    <header className="sticky top-0 z-20 w-full h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 transition-all duration-300">
      <div className="flex items-center gap-4 ml-8 md:ml-0">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Global Company Filter */}
        <div className="hidden md:flex items-center gap-2 w-64">
          <Building className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedCompanyId || 'all'}
            onValueChange={(val) =>
              setSelectedCompanyId(val === 'all' ? null : val)
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas as Empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Empresas</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border border-background" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="pl-2 pr-1 gap-2 rounded-full hover:bg-secondary"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={`https://img.usecurling.com/ppl/thumbnail?gender=male&seed=${userProfile?.id || '1'}`}
                />
                <AvatarFallback>
                  {userProfile?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block text-sm font-medium">
                {userProfile?.name || 'Usuário'}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/configuracoes">
                <User className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
              </Link>
            </DropdownMenuItem>
            {userProfile?.profile === 'Administrator' && (
              <DropdownMenuItem asChild>
                <Link to="/configuracoes?tab=ajustes">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Ajustes Manuais</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
