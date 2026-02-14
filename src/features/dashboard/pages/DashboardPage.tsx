import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Phone,
  MapPin,
  MessageSquare,
  Mail,
  FileText,
  Handshake,
  MoreHorizontal,
} from 'lucide-react'
import {
  useAdminStats,
  useAgentStats,
  useBankUserStats,
  useRecentActions,
  useUpcomingPromises,
} from '../hooks/useDashboardStats'
import type { RecentAction, UpcomingPromise } from '../hooks/useDashboardStats'
import { ActionTypeLabels, ActionResultLabels } from '@/types/enums'
import type { ActionType, ActionResult } from '@/types/enums'

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

// Icône selon le type d'action
const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  visit: MapPin,
  sms: MessageSquare,
  email: Mail,
  letter: FileText,
  meeting: Handshake,
  other: MoreHorizontal,
}

// Temps relatif simple
function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'hier'
  if (diffD < 7) return `il y a ${diffD}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Label de date relative pour les promesses
function dueDateLabel(dateStr: string): { text: string; variant: 'destructive' | 'secondary' | 'outline' } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0) return { text: 'En retard', variant: 'destructive' }
  if (diffDays === 0) return { text: "Aujourd'hui", variant: 'destructive' }
  if (diffDays === 1) return { text: 'Demain', variant: 'secondary' }
  return { text: `Dans ${diffDays}j`, variant: 'outline' }
}

const formatMRU = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MRU', minimumFractionDigits: 0 }).format(amount)

// Skeleton pour les listes d'activité
function ActivityListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { currentUser } = useAuth()
  const { isAdmin, isAgent, isBankUser, bankId } = usePermissions()

  const navigate = useNavigate()

  const { data: adminStats, isLoading: adminLoading } = useAdminStats(isAdmin)
  const { data: agentStats, isLoading: agentLoading } = useAgentStats(isAgent)
  const { data: bankStats, isLoading: bankLoading } = useBankUserStats(bankId)
  const { data: recentActions, isLoading: actionsLoading } = useRecentActions()
  const { data: upcomingPromises, isLoading: promisesLoading } = useUpcomingPromises()

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
            {actionsLoading ? (
              <ActivityListSkeleton />
            ) : !recentActions?.length ? (
              <EmptyState
                icon={Activity}
                message="Aucune activité récente à afficher."
              />
            ) : (
              <div className="space-y-1">
                {recentActions.map((action: RecentAction) => {
                  const Icon = ACTION_ICONS[action.action_type] || Activity
                  return (
                    <button
                      key={action.id}
                      onClick={() => navigate(`/cases/${action.case_id}`)}
                      className="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">
                          {ActionTypeLabels[action.action_type as ActionType]}{' '}
                          <span className="font-normal text-muted-foreground">
                            — {ActionResultLabels[action.result as ActionResult]}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {action.case_reference} · {action.debtor_name}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(action.action_date)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
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
            {promisesLoading ? (
              <ActivityListSkeleton />
            ) : !upcomingPromises?.length ? (
              <EmptyState
                icon={CalendarClock}
                message="Aucune promesse à échéance proche."
              />
            ) : (
              <div className="space-y-1">
                {upcomingPromises.map((promise: UpcomingPromise) => {
                  const dateInfo = dueDateLabel(promise.due_date)
                  return (
                    <button
                      key={promise.id}
                      onClick={() => navigate(`/cases/${promise.case_id}`)}
                      className="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                        <CalendarClock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">
                          {formatMRU(promise.amount)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {promise.case_reference} · {promise.debtor_name}
                        </p>
                      </div>
                      <Badge variant={dateInfo.variant} className="shrink-0">
                        {dateInfo.text}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
