import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Settings, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/ui/logo'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { currentUser, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex w-full items-center px-6">
        {/* Partie gauche : menu mobile + logo mobile */}
        <div className="flex items-center gap-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
        </div>

        {/* Nom entreprise au centre (desktop) - positionné absolument pour un centrage parfait */}
        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center lg:flex">
          <span className="text-lg font-bold tracking-tight text-primary">
            Altis Services
          </span>
        </div>

        {/* Spacer pour pousser les actions à droite */}
        <div className="flex-1" />

        {/* Actions à droite */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>

          {/* Séparateur vertical */}
          <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

          {/* Menu utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2.5 px-2"
                aria-label={`Menu utilisateur : ${currentUser?.full_name || 'Utilisateur'}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {currentUser?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden text-sm font-medium sm:inline-block">
                  {currentUser?.full_name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{currentUser?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
