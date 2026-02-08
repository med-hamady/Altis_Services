import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  FolderKanban,
  FileText,
  BarChart3,
  UserCircle,
  ClipboardList,
  UserCog,
  FileUp,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/ui/logo'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ('admin' | 'agent' | 'bank_user')[]
}

const navItems: NavItem[] = [
  {
    title: 'Tableau de bord',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Banques',
    href: '/banks',
    icon: Building2,
    roles: ['admin'],
  },
  {
    title: 'Utilisateurs',
    href: '/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Dossiers',
    href: '/cases',
    icon: FolderKanban,
    roles: ['admin', 'bank_user'],
  },
  {
    title: 'Mes dossiers',
    href: '/cases',
    icon: ClipboardList,
    roles: ['agent'],
  },
  {
    title: 'Débiteurs',
    href: '/debtors',
    icon: UserCircle,
    roles: ['admin', 'bank_user'],
  },
  {
    title: 'Import Excel',
    href: '/imports',
    icon: FileUp,
    roles: ['admin'],
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
    roles: ['admin'],
  },
  {
    title: 'Mon profil',
    href: '/profile',
    icon: UserCog,
    roles: ['bank_user'],
  },
  {
    title: 'Rapports',
    href: '/reports',
    icon: BarChart3,
  },
]

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { userType } = useAuth()

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    if (!userType) return false
    return item.roles.includes(userType)
  })

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] flex-col border-r bg-card"
      aria-label="Navigation principale"
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-center border-b">
        <Logo size="lg" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu principal">
        <ul className="space-y-0.5">
          {filteredNavItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.href}
                end={item.href === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bas de sidebar : juste un trait */}
      <div className="shrink-0 border-t" />
    </aside>
  )
}
