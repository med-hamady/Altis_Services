import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Phone,
  Mail,
  FolderKanban,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAgents } from '@/features/users/hooks/useUsers'
import { useAgentStats, useAgentCases, useAgentActions } from '../hooks/useAgentDetail'
import { CaseStatusLabels, ActionTypeLabels, ActionResultLabels } from '@/types/enums'
import type { CaseStatus } from '@/types/enums'

// ─── helpers ────────────────────────────────────────────────────────────────

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MRU',
    minimumFractionDigits: 0,
  }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

const formatDateTime = (date: string) =>
  new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'new': return 'outline'
    case 'assigned': return 'secondary'
    case 'in_progress': return 'default'
    case 'promise': return 'default'
    case 'partial_payment': return 'secondary'
    case 'paid': return 'default'
    case 'closed': return 'destructive'
    default: return 'outline'
  }
}

const getDebtorName = (c: { debtor_pp?: { first_name: string; last_name: string } | null; debtor_pm?: { company_name: string } | null }) => {
  if (c.debtor_pp) return `${c.debtor_pp.first_name} ${c.debtor_pp.last_name}`
  if (c.debtor_pm) return c.debtor_pm.company_name
  return '—'
}

// ─── stat card ──────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: agents, isLoading: agentsLoading } = useAgents()
  const agent = agents?.find((a) => a.id === id)

  const { data: stats, isLoading: statsLoading } = useAgentStats(id)
  const { data: cases, isLoading: casesLoading } = useAgentCases(id)
  const { data: actions, isLoading: actionsLoading } = useAgentActions(id)

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Agent introuvable</p>
        <Button variant="outline" onClick={() => navigate('/users')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux utilisateurs
        </Button>
      </div>
    )
  }

  const totalCases = cases?.length ?? 0
  const activeCases = cases?.filter((c) => c.status !== 'closed').length ?? 0
  const totalActions = actions?.length ?? 0

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/users')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profil agent</h1>
          <p className="text-muted-foreground">Suivi et activité de l'agent</p>
        </div>
      </div>

      {/* Fiche agent */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar initiales */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {agent.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{agent.full_name}</h2>
                  <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                    {agent.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                {agent.username && (
                  <p className="text-sm text-muted-foreground">@{agent.username}</p>
                )}
                <div className="flex flex-wrap gap-4 pt-1">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {agent.email}
                  </span>
                  {agent.phone && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {agent.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground shrink-0">
              Membre depuis le {formatDate(agent.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Dossiers assignés"
          value={statsLoading ? '…' : (stats?.myCases ?? totalCases)}
          icon={FolderKanban}
          description="Total cumulé"
        />
        <StatCard
          title="Dossiers actifs"
          value={casesLoading ? '…' : activeCases}
          icon={Clock}
          description="Non clôturés"
        />
        <StatCard
          title="Actions effectuées"
          value={actionsLoading ? '…' : totalActions}
          icon={Activity}
          description="Toutes périodes"
        />
        <StatCard
          title="Clôturés ce mois"
          value={statsLoading ? '…' : (stats?.closedThisMonth ?? '—')}
          icon={CheckCircle}
          description="Mois en cours"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cases">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="cases">
            Dossiers ({casesLoading ? '…' : totalCases})
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activité ({actionsLoading ? '…' : totalActions})
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab Dossiers ─── */}
        <TabsContent value="cases" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {casesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <p className="text-muted-foreground">Chargement des dossiers...</p>
                </div>
              ) : cases && cases.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Débiteur</TableHead>
                      <TableHead className="hidden md:table-cell">Banque</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((c) => {
                      const totalAmount =
                        (c.amount_principal ?? 0) +
                        (c.amount_interest ?? 0) +
                        (c.amount_penalties ?? 0) +
                        (c.amount_fees ?? 0)
                      return (
                        <TableRow
                          key={c.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/cases/${c.id}`)}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            {c.reference}
                          </TableCell>
                          <TableCell>{getDebtorName(c as Parameters<typeof getDebtorName>[0])}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {(c as { bank?: { name: string } }).bank?.name ?? '—'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right font-medium">
                            {formatAmount(totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(c.status)}>
                              {CaseStatusLabels[c.status as CaseStatus] ?? c.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FolderKanban className="h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-muted-foreground">Aucun dossier assigné</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab Activité ─── */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {actionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <p className="text-muted-foreground">Chargement de l'activité...</p>
                </div>
              ) : actions && actions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Résultat</TableHead>
                      <TableHead>Dossier</TableHead>
                      <TableHead className="hidden md:table-cell">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(action.action_date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {ActionTypeLabels[action.action_type] ?? action.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm">
                            {ActionResultLabels[action.result] ?? action.result}
                          </span>
                        </TableCell>
                        <TableCell>
                          {action.case_info ? (
                            <Link
                              to={`/cases/${action.case_info.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-sm font-medium text-primary hover:underline"
                            >
                              {action.case_info.reference}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[220px]">
                          {action.notes ? (
                            <span
                              title={action.notes}
                              className="text-sm text-muted-foreground line-clamp-2 cursor-help"
                            >
                              {action.notes}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-muted-foreground">Aucune action enregistrée</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
