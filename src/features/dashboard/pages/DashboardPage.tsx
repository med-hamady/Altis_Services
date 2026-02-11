import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth, usePermissions } from '@/contexts/AuthContext'
import {
  FolderKanban,
  Users,
  Building2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  CalendarClock,
} from 'lucide-react'
import { useAdminStats, useAgentStats, useBankUserStats } from '../hooks/useDashboardStats'

// Skeleton pour le chargement
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

// Composant de carte statistique
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  isLoading,
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: { value: number; positive: boolean }
  isLoading?: boolean
}) {
  if (isLoading) return <StatCardSkeleton />

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p
            className={`mt-1 text-xs font-medium ${
              trend.positive ? 'text-success' : 'text-destructive'
            }`}
          >
            {trend.positive ? '+' : ''}
            {trend.value}% par rapport au mois dernier
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Composant d'état vide
function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>
  message: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function DashboardPage() {
  const { currentUser } = useAuth()
  const { isAdmin, isAgent, isBankUser, bankId } = usePermissions()

  const { data: adminStats, isLoading: adminLoading } = useAdminStats(isAdmin)
  const { data: agentStats, isLoading: agentLoading } = useAgentStats(isAgent)
  const { data: bankStats, isLoading: bankLoading } = useBankUserStats(bankId)

  const isLoading = isAdmin ? adminLoading : isAgent ? agentLoading : bankLoading

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground">
          Bienvenue, {currentUser?.full_name}
        </p>
      </div>

      {/* Statistiques - Admin */}
      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total dossiers"
            value={adminStats?.totalCases || 0}
            description="Tous statuts confondus"
            icon={FolderKanban}
            isLoading={isLoading}
          />
          <StatCard
            title="Dossiers en cours"
            value={adminStats?.casesInProgress || 0}
            description="Nécessitant une action"
            icon={Clock}
            isLoading={isLoading}
          />
          <StatCard
            title="Banques actives"
            value={adminStats?.activeBanks || 0}
            icon={Building2}
            isLoading={isLoading}
          />
          <StatCard
            title="Agents actifs"
            value={adminStats?.activeAgents || 0}
            icon={Users}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Statistiques - Agent */}
      {isAgent && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Mes dossiers"
            value={agentStats?.myCases || 0}
            description="Affectés à vous"
            icon={FolderKanban}
            isLoading={isLoading}
          />
          <StatCard
            title="À traiter"
            value={agentStats?.casesToProcess || 0}
            description="Actions en attente"
            icon={AlertCircle}
            isLoading={isLoading}
          />
          <StatCard
            title="Promesses"
            value={agentStats?.upcomingPromises || 0}
            description="À relancer cette semaine"
            icon={Clock}
            isLoading={isLoading}
          />
          <StatCard
            title="Clôturés ce mois"
            value={agentStats?.closedThisMonth || 0}
            description="Dossiers résolus"
            icon={CheckCircle}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Statistiques - Banque */}
      {isBankUser && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Vos dossiers"
            value={bankStats?.totalCases || 0}
            description="Total confiés"
            icon={FolderKanban}
            isLoading={isLoading}
          />
          <StatCard
            title="En recouvrement"
            value={bankStats?.casesInRecovery || 0}
            description="En cours de traitement"
            icon={Clock}
            isLoading={isLoading}
          />
          <StatCard
            title="Taux de recouvrement"
            value={`${bankStats?.recoveryRate || 0}%`}
            description="Sur 12 mois"
            icon={TrendingUp}
            isLoading={isLoading}
          />
          <StatCard
            title="Montant recouvré"
            value={`${(bankStats?.amountRecovered || 0).toLocaleString('fr-FR')} MRU`}
            description="Ce mois"
            icon={CheckCircle}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Cartes activité + promesses */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activité récente</CardTitle>
            <CardDescription>
              Les dernières actions sur vos dossiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Activity}
              message="Aucune activité récente à afficher."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Promesses à venir</CardTitle>
            <CardDescription>
              Échéances des 7 prochains jours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={CalendarClock}
              message="Aucune promesse à échéance proche."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
