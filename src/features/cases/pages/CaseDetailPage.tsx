import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  User,
  Banknote,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Shield,
  FileText,
  MessageSquare,
  CreditCard,
  FolderKanban,
  UserCheck,
  AlertTriangle,
  Clock,
  Ban,
  Zap,
} from 'lucide-react'
import { usePermissions } from '@/contexts/AuthContext'
import { useCaseDetail, useCaseActions, useCasePromises, useCasePayments, useCaseDocuments } from '../hooks/useCaseDetail'
import { AssignAgentDialog } from '../components/AssignAgentDialog'
import { AddActionDialog } from '../components/AddActionDialog'
import type { ActionDialogResult } from '../components/AddActionDialog'
import { AddPromiseDialog } from '../components/AddPromiseDialog'
import { AddPaymentDialog } from '../components/AddPaymentDialog'
import { ActionResult, ActionType } from '@/types/enums'
import {
  CaseStatusLabels,
  CasePriorityLabels,
  CasePhaseLabels,
  ActionTypeLabels,
  ActionResultLabels,
  PromiseStatusLabels,
  PaymentStatusLabels,
  DocumentCategoryLabels,
  DocumentVisibilityLabels,
  ClosureReasonLabels,
} from '@/types/enums'

// --- Helpers ---

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MRU',
    minimumFractionDigits: 0,
  }).format(amount)

const formatDate = (date: string | null) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

const formatDateTime = (date: string | null) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

const priorityVariant = (priority: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (priority) {
    case 'low': return 'secondary'
    case 'medium': return 'default'
    case 'high': return 'destructive'
    case 'urgent': return 'destructive'
    default: return 'default'
  }
}

const promiseStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'pending': return 'outline'
    case 'kept': return 'default'
    case 'broken': return 'destructive'
    case 'rescheduled': return 'secondary'
    default: return 'outline'
  }
}

const paymentStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'pending': return 'outline'
    case 'validated': return 'default'
    case 'rejected': return 'destructive'
    default: return 'outline'
  }
}

// --- Info row component ---

function InfoRow({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ComponentType<{ className?: string }> }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-1.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  )
}

// --- Main page ---

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin, canCreateAction, canCreatePromise, canDeclarePayment } = usePermissions()

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [promiseDialogOpen, setPromiseDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [defaultActionType, setDefaultActionType] = useState<ActionType | undefined>()

  // Prompts chaînés : après une action, proposer d'ouvrir promesse ou paiement
  const handleActionCreated = (data: ActionDialogResult) => {
    if (data.result === ActionResult.Promise) {
      // Promesse obtenue => ouvrir le dialog promesse
      setTimeout(() => setPromiseDialogOpen(true), 300)
    } else if (data.result === ActionResult.PartialPayment || data.result === ActionResult.FullPayment) {
      // Paiement déclaré => ouvrir le dialog paiement
      setTimeout(() => setPaymentDialogOpen(true), 300)
    }
  }

  // Ouvrir le dialog action avec un type pré-rempli (bouton rapide)
  const openQuickAction = (type?: ActionType) => {
    setDefaultActionType(type)
    setActionDialogOpen(true)
  }

  const { data: caseData, isLoading, error } = useCaseDetail(id)
  const { data: actions } = useCaseActions(id)
  const { data: promises } = useCasePromises(id)
  const { data: payments } = useCasePayments(id)
  const { data: documents } = useCaseDocuments(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Chargement du dossier...</p>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Dossier introuvable</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce dossier n'existe pas ou vous n'y avez pas accès.
        </p>
        <Button className="mt-4" onClick={() => navigate('/cases')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux dossiers
        </Button>
      </div>
    )
  }

  const totalAmount =
    (caseData.amount_principal || 0) +
    (caseData.amount_interest || 0) +
    (caseData.amount_penalties || 0) +
    (caseData.amount_fees || 0)

  const totalPaid = payments
    ?.filter((p) => p.status === 'validated')
    .reduce((sum, p) => sum + p.amount, 0) ?? 0

  const remainingBalance = totalAmount - totalPaid

  const debtorName = caseData.debtor_pp
    ? `${caseData.debtor_pp.first_name} ${caseData.debtor_pp.last_name}`
    : caseData.debtor_pm?.company_name || '—'
  const debtorType = caseData.debtor_pp ? 'Personne Physique' : 'Personne Morale'

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/cases')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono">
                {caseData.reference}
              </h1>
              <Badge variant={statusVariant(caseData.status)}>
                {CaseStatusLabels[caseData.status] || caseData.status}
              </Badge>
              <Badge variant={priorityVariant(caseData.priority)}>
                {CasePriorityLabels[caseData.priority] || caseData.priority}
              </Badge>
              <Badge variant="outline">
                {CasePhaseLabels[caseData.phase] || caseData.phase}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {debtorName} &middot; {caseData.bank?.name || '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {canCreateAction && caseData.status !== 'closed' && caseData.status !== 'paid' && (
            <Button onClick={() => openQuickAction()} variant="default" className="w-full sm:w-auto">
              <Zap className="mr-2 h-4 w-4" />
              Faire maintenant
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setAssignDialogOpen(true)} variant="outline" className="w-full sm:w-auto">
              <UserCheck className="mr-2 h-4 w-4" />
              {caseData.assigned_agent ? 'Réaffecter' : 'Affecter un agent'}
            </Button>
          )}
        </div>
      </div>

      {/* Grille d'informations */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card Informations du dossier */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Informations du dossier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="Banque" value={caseData.bank?.name} icon={Building2} />
            <InfoRow label="Réf. banque" value={caseData.bank_reference} />
            <InfoRow label="Agent assigné" value={caseData.assigned_agent?.full_name} icon={UserCheck} />
            <InfoRow label="Date d'ouverture" value={formatDate(caseData.created_at)} icon={Calendar} />
            <InfoRow label="Date de défaut" value={formatDate(caseData.default_date)} icon={Calendar} />
            <InfoRow label="Produit" value={caseData.product_type} />
            <InfoRow label="Réf. contrat" value={caseData.contract_reference} />
            <InfoRow label="Niveau de risque" value={caseData.risk_level} icon={AlertTriangle} />

            {/* Solde restant - résumé rapide */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Solde restant</span>
                <span className={`text-sm font-semibold ${remainingBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {formatAmount(remainingBalance)}
                </span>
              </div>
              {totalPaid > 0 && (
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs text-muted-foreground">Payé</span>
                  <span className="text-xs text-green-600">{formatAmount(totalPaid)} / {formatAmount(totalAmount)}</span>
                </div>
              )}
            </div>

            {/* Dernière action + prochaine action planifiée */}
            {actions && actions.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Dernière action
                </p>
                <p className="text-sm">
                  {ActionTypeLabels[actions[0].action_type] || actions[0].action_type}
                  {' — '}
                  {formatDate(actions[0].action_date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ActionResultLabels[actions[0].result] || actions[0].result}
                </p>
                {actions[0].next_action_type && (
                  <div className="mt-1.5 rounded-md bg-blue-50 dark:bg-blue-950 p-2">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Prochaine action planifiée
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {ActionTypeLabels[actions[0].next_action_type]} — {formatDate(actions[0].next_action_date)}
                    </p>
                    {actions[0].next_action_notes && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                        {actions[0].next_action_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Motif de clôture */}
            {caseData.closure_reason && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Ban className="h-3 w-3" /> Clôture
                </p>
                <p className="text-sm font-medium">
                  {ClosureReasonLabels[caseData.closure_reason] || caseData.closure_reason}
                </p>
                {caseData.closed_at && (
                  <p className="text-xs text-muted-foreground">le {formatDate(caseData.closed_at)}</p>
                )}
                {caseData.closure_notes && (
                  <p className="text-sm text-muted-foreground mt-1">{caseData.closure_notes}</p>
                )}
              </div>
            )}

            {caseData.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{caseData.notes}</p>
              </div>
            )}
            {isAdmin && caseData.internal_notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Notes internes (admin)</p>
                <p className="text-sm whitespace-pre-wrap">{caseData.internal_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card Débiteur */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Débiteur — {debtorType}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {caseData.debtor_pp ? (
              <>
                <InfoRow label="Nom" value={caseData.debtor_pp.last_name} icon={User} />
                <InfoRow label="Prénom" value={caseData.debtor_pp.first_name} icon={User} />
                <InfoRow label="Numéro client" value={caseData.debtor_pp.id_number} icon={Shield} />

                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Situation professionnelle</p>
                  <InfoRow label="Emploi" value={caseData.debtor_pp.occupation} icon={Briefcase} />
                  <InfoRow label="Employeur" value={caseData.debtor_pp.employer} icon={Building2} />
                  <InfoRow
                    label="Adresse travail"
                    value={[caseData.debtor_pp.address_work_street, caseData.debtor_pp.address_work_city, caseData.debtor_pp.address_work_region].filter(Boolean).join(', ') || null}
                    icon={MapPin}
                  />
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Contact</p>
                  <InfoRow label="Tél. principal" value={caseData.debtor_pp.phone_primary} icon={Phone} />
                  <InfoRow label="Tél. secondaire" value={caseData.debtor_pp.phone_secondary} icon={Phone} />
                  <InfoRow label="Email" value={caseData.debtor_pp.email} icon={Mail} />
                  {caseData.debtor_pp.alt_contact_name && (
                    <>
                      <InfoRow label="Contact alternatif" value={caseData.debtor_pp.alt_contact_name} icon={User} />
                      <InfoRow label="Relation" value={caseData.debtor_pp.alt_contact_relation} />
                      <InfoRow label="Tél. alternatif" value={caseData.debtor_pp.alt_contact_phone} icon={Phone} />
                    </>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Adresse géographique</p>
                  <InfoRow label="Adresse" value={caseData.debtor_pp.address_street} icon={MapPin} />
                  <InfoRow label="Ville" value={caseData.debtor_pp.address_city} />
                  <InfoRow label="Région" value={caseData.debtor_pp.address_region} />
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Dates</p>
                  <InfoRow label="Date d'affectation" value={formatDate(caseData.created_at)} icon={Calendar} />
                  <InfoRow label="Date de défaut" value={formatDate(caseData.default_date)} icon={Calendar} />
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Engagements détaillés</p>
                  <div className="space-y-1.5 rounded-md bg-muted/50 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Montant principal</span>
                      <span className="font-medium">{formatAmount(caseData.amount_principal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Intérêts</span>
                      <span className="font-medium">{formatAmount(caseData.amount_interest)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pénalités</span>
                      <span className="font-medium">{formatAmount(caseData.amount_penalties)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frais</span>
                      <span className="font-medium">{formatAmount(caseData.amount_fees)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1.5 font-semibold text-sm">
                      <span>Total dû</span>
                      <span>{formatAmount(totalAmount)}</span>
                    </div>
                    {totalPaid > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Total payé</span>
                        <span>- {formatAmount(totalPaid)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1.5 font-semibold text-sm">
                      <span>Solde restant</span>
                      <span className={remainingBalance > 0 ? 'text-destructive' : 'text-green-600'}>
                        {formatAmount(remainingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : caseData.debtor_pm ? (
              <>
                <InfoRow label="Société" value={caseData.debtor_pm.company_name} icon={Building2} />
                <InfoRow label="Nom commercial" value={caseData.debtor_pm.trade_name} />
                <InfoRow label="RC" value={caseData.debtor_pm.rc_number} icon={Shield} />
                <InfoRow label="NIF" value={caseData.debtor_pm.nif} icon={Shield} />
                <InfoRow label="Représentant légal" value={caseData.debtor_pm.legal_rep_name} icon={User} />
                <InfoRow label="Fonction" value={caseData.debtor_pm.legal_rep_title} />
                <InfoRow label="Tél. représentant" value={caseData.debtor_pm.legal_rep_phone} icon={Phone} />
                <InfoRow label="Tél. principal" value={caseData.debtor_pm.phone_primary} icon={Phone} />
                <InfoRow label="Tél. secondaire" value={caseData.debtor_pm.phone_secondary} icon={Phone} />
                <InfoRow label="Email" value={caseData.debtor_pm.email} icon={Mail} />
                <InfoRow
                  label="Adresse"
                  value={[caseData.debtor_pm.address_street, caseData.debtor_pm.address_city, caseData.debtor_pm.address_region].filter(Boolean).join(', ') || null}
                  icon={MapPin}
                />
                <InfoRow label="Secteur" value={caseData.debtor_pm.sector_activity} />
                {caseData.debtor_pm.alt_contact_name && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Contact alternatif</p>
                    <InfoRow label="Nom" value={caseData.debtor_pm.alt_contact_name} icon={User} />
                    <InfoRow label="Relation" value={caseData.debtor_pm.alt_contact_relation} />
                    <InfoRow label="Téléphone" value={caseData.debtor_pm.alt_contact_phone} icon={Phone} />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun débiteur associé</p>
            )}
          </CardContent>
        </Card>

        {/* Card Dette */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4" />
              Dette
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant principal</span>
                <span>{formatAmount(caseData.amount_principal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Intérêts / pénalités</span>
                <span>{formatAmount(caseData.amount_interest)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pénalités de retard</span>
                <span>{formatAmount(caseData.amount_penalties)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frais</span>
                <span>{formatAmount(caseData.amount_fees)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total dû</span>
                <span>{formatAmount(totalAmount)}</span>
              </div>
              {totalPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Total payé (validé)</span>
                    <span>- {formatAmount(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Solde restant</span>
                    <span>{formatAmount(remainingBalance)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Garantie */}
            {caseData.guarantee_type && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Garantie</p>
                <p className="text-sm">{caseData.guarantee_type}</p>
                {caseData.guarantee_description && (
                  <p className="text-sm text-muted-foreground">{caseData.guarantee_description}</p>
                )}
              </div>
            )}

            {/* Dernier paiement banque */}
            {caseData.last_bank_payment_date && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">Dernier paiement (banque)</p>
                <p className="text-sm">
                  {formatDate(caseData.last_bank_payment_date)}
                  {caseData.last_bank_payment_amount != null && (
                    <> — {formatAmount(caseData.last_bank_payment_amount)}</>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="actions">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="actions" className="gap-1 text-xs sm:text-sm sm:gap-1.5">
            <MessageSquare className="hidden sm:block h-3.5 w-3.5" />
            Actions ({actions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="promises" className="gap-1 text-xs sm:text-sm sm:gap-1.5">
            <Calendar className="hidden sm:block h-3.5 w-3.5" />
            Promesses ({promises?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1 text-xs sm:text-sm sm:gap-1.5">
            <CreditCard className="hidden sm:block h-3.5 w-3.5" />
            Paiements ({payments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1 text-xs sm:text-sm sm:gap-1.5">
            <FileText className="hidden sm:block h-3.5 w-3.5" />
            Docs ({documents?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab Actions */}
        <TabsContent value="actions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Historique des actions</CardTitle>
              {canCreateAction && (
                <Button size="sm" onClick={() => setActionDialogOpen(true)}>
                  Nouvelle action
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {actions && actions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Résultat</TableHead>
                      <TableHead className="hidden md:table-cell">Compte-rendu</TableHead>
                      <TableHead className="hidden md:table-cell">Prochaine action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(action.action_date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ActionTypeLabels[action.action_type] || action.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {ActionResultLabels[action.result] || action.result}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[300px]">
                          <p className="text-sm truncate">{action.notes || '—'}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {action.next_action_type ? (
                            <span>
                              {ActionTypeLabels[action.next_action_type]} — {formatDate(action.next_action_date)}
                            </span>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucune action enregistrée
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Promesses */}
        <TabsContent value="promises">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Promesses de paiement</CardTitle>
              {canCreatePromise && (
                <Button size="sm" onClick={() => setPromiseDialogOpen(true)}>
                  Nouvelle promesse
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {promises && promises.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Réf.</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promises.map((promise) => (
                      <TableRow key={promise.id}>
                        <TableCell className="font-mono text-sm">
                          {promise.reference || '—'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(promise.amount)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(promise.due_date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {promise.payment_method || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={promiseStatusVariant(promise.status)}>
                            {PromiseStatusLabels[promise.status] || promise.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucune promesse enregistrée
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Paiements */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Paiements</CardTitle>
              {canDeclarePayment && (
                <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                  Déclarer un paiement
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Réf. transaction</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-sm">
                          {formatDate(payment.payment_date)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatAmount(payment.amount)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.payment_method || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.transaction_reference || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={paymentStatusVariant(payment.status)}>
                            {PaymentStatusLabels[payment.status] || payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun paiement enregistré
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents et pièces</CardTitle>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom du fichier</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="hidden sm:table-cell">Visibilité</TableHead>
                      <TableHead>Date d'ajout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{doc.file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {DocumentCategoryLabels[doc.category] || doc.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {DocumentVisibilityLabels[doc.visibility] || doc.visibility}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(doc.uploaded_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun document ajouté
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AssignAgentDialog
        caseId={caseData.id}
        currentAgentId={caseData.assigned_agent_id}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />
      <AddActionDialog
        caseId={caseData.id}
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        onCreated={handleActionCreated}
        defaultActionType={defaultActionType}
      />
      <AddPromiseDialog
        caseId={caseData.id}
        open={promiseDialogOpen}
        onOpenChange={setPromiseDialogOpen}
        remainingBalance={remainingBalance}
      />
      <AddPaymentDialog
        caseId={caseData.id}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        remainingBalance={remainingBalance}
      />
    </div>
  )
}
