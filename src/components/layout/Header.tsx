import {
  Bell,
  User,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
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
import { useLocation } from 'react-router-dom'

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/':
      return 'Dashboard'
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
    case '/auditoria':
      return 'Auditoria'
    case '/ajustes':
      return 'Ajustes Manuais'
    default:
      return 'HospFlow'
  }
}

export function Header() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 right-0 left-0 md:left-64 z-20 px-6 flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-4 ml-8 md:ml-0">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:block w-48">
          <Select defaultValue="hospcom">
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hospcom">Hospcom Matriz</SelectItem>
              <SelectItem value="filial1">Hospcom Filial SP</SelectItem>
              <SelectItem value="filial2">Hospcom Filial RJ</SelectItem>
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
                <AvatarImage src="https://img.usecurling.com/ppl/thumbnail?gender=male" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block text-sm font-medium">
                João Silva
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Ajustes Manuais</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
