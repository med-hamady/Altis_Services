import { useState, useCallback } from 'react'
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
  ShieldCheck,
  FileText,
  ClipboardList,
  MessageSquare,
  CreditCard,
  FolderKanban,
  UserCheck,
  AlertTriangle,
  Clock,
  Ban,
  Zap,
  Check,
  XCircle,
  MoreHorizontal,
  CalendarClock,
  Trash2,
  CheckCircle2,
  XOctagon,
  Pencil,
  Plus,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermissions } from '@/contexts/AuthContext'
import { useCaseDetail, useCaseActions, useCasePromises, useCasePayments, useValidatePayment, useUpdatePromiseStatus, useDeletePromise, useCaseExtraInfo, useCreateExtraInfo, useDeleteExtraInfo } from '../hooks/useCaseDetail'
import { AssignAgentDialog } from '../components/AssignAgentDialog'
import { AddActionDialog } from '../components/AddActionDialog'
import type { ActionDialogResult } from '../components/AddActionDialog'
import { AddPromiseDialog } from '../components/AddPromiseDialog'
import { EditCaseDialog } from '../components/EditCaseDialog'
import { AddPaymentDialog } from '../components/AddPaymentDialog'
import { ActionResult, ActionType, PromiseStatus } from '@/types/enums'
import {
  CaseStatusLabels,
  CasePhaseLabels,
  ActionTypeLabels,
  ActionResultLabels,
  PromiseStatusLabels,
  PaymentStatusLabels,
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
  const { isAdmin, canCreateAction, canCreatePromise, canDeclarePayment, canValidatePayment } = usePermissions()
  const validatePayment = useValidatePayment()
  const updatePromiseStatus = useUpdatePromiseStatus()
  const deletePromise = useDeletePromise()
  const createExtraInfo = useCreateExtraInfo()
  const deleteExtraInfo = useDeleteExtraInfo()

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [promiseDialogOpen, setPromiseDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [editCaseDialogOpen, setEditCaseDialogOpen] = useState(false)
  const [paymentDefaultAmount, setPaymentDefaultAmount] = useState<number | undefined>()
  const [defaultActionType, setDefaultActionType] = useState<ActionType | undefined>()

  // État pour le dialog de rejet de paiement
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // État pour les dialogs de promesse
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [reschedulePromiseId, setReschedulePromiseId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingPromiseId, setDeletingPromiseId] = useState<string | null>(null)

  // État pour info complémentaire
  const [addInfoOpen, setAddInfoOpen] = useState(false)
  const [infoLabel, setInfoLabel] = useState('')
  const [infoValue, setInfoValue] = useState('')

  const handleValidatePayment = useCallback(async (paymentId: string) => {
    if (!id) return
    try {
      await validatePayment.mutateAsync({ payment_id: paymentId, case_id: id, approved: true })
      toast.success('Paiement validé avec succès')
    } catch {
      toast.error('Erreur lors de la validation du paiement')
    }
  }, [id, validatePayment])

  const openRejectDialog = useCallback((paymentId: string) => {
    setRejectingPaymentId(paymentId)
    setRejectionReason('')
    setRejectDialogOpen(true)
  }, [])

  const handleRejectPayment = useCallback(async () => {
    if (!id || !rejectingPaymentId) return
    try {
      await validatePayment.mutateAsync({
        payment_id: rejectingPaymentId,
        case_id: id,
        approved: false,
        rejection_reason: rejectionReason || undefined,
      })
      toast.success('Paiement rejeté')
      setRejectDialogOpen(false)
      setRejectingPaymentId(null)
    } catch {
      toast.error('Erreur lors du rejet du paiement')
    }
  }, [id, rejectingPaymentId, rejectionReason, validatePayment])

  // --- Handlers promesses ---
  const handleMarkPromiseKept = useCallback(async (promiseId: string, promiseAmount: number) => {
    if (!id) return
    try {
      await updatePromiseStatus.mutateAsync({
        promise_id: promiseId,
        case_id: id,
        status: 'kept',
      })
      toast.success('Promesse marquée comme tenue')
      // Pré-remplir le montant et ouvrir le dialog paiement
      setPaymentDefaultAmount(promiseAmount)
      setTimeout(() => setPaymentDialogOpen(true), 300)
    } catch {
      toast.error('Erreur lors de la mise à jour de la promesse')
    }
  }, [id, updatePromiseStatus])

  const handleMarkPromiseBroken = useCallback(async (promiseId: string) => {
    if (!id) return
    try {
      await updatePromiseStatus.mutateAsync({
        promise_id: promiseId,
        case_id: id,
        status: 'broken',
      })
      toast.success('Promesse marquée comme non tenue')
    } catch {
      toast.error('Erreur lors de la mise à jour de la promesse')
    }
  }, [id, updatePromiseStatus])

  const openRescheduleDialog = useCallback((promiseId: string) => {
    setReschedulePromiseId(promiseId)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setRescheduleDate(tomorrow.toISOString().slice(0, 10))
    setRescheduleNotes('')
    setRescheduleDialogOpen(true)
  }, [])

  const handleReschedulePromise = useCallback(async () => {
    if (!id || !reschedulePromiseId) return
    try {
      await updatePromiseStatus.mutateAsync({
        promise_id: reschedulePromiseId,
        case_id: id,
        status: 'rescheduled',
        new_due_date: rescheduleDate,
        status_notes: rescheduleNotes || undefined,
      })
      toast.success('Promesse replanifiée')
      setRescheduleDialogOpen(false)
      setReschedulePromiseId(null)
    } catch {
      toast.error('Erreur lors de la replanification')
    }
  }, [id, reschedulePromiseId, rescheduleDate, rescheduleNotes, updatePromiseStatus])

  const openDeletePromiseDialog = useCallback((promiseId: string) => {
    setDeletingPromiseId(promiseId)
    setDeleteConfirmOpen(true)
  }, [])

  const handleDeletePromise = useCallback(async () => {
    if (!id || !deletingPromiseId) return
    try {
      await deletePromise.mutateAsync({ promise_id: deletingPromiseId, case_id: id })
      toast.success('Promesse supprimée')
      setDeleteConfirmOpen(false)
      setDeletingPromiseId(null)
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }, [id, deletingPromiseId, deletePromise])

  // Prompts chaînés : après une action, proposer d'ouvrir promesse ou paiement
  const handleActionCreated = (data: ActionDialogResult) => {
    if (data.result === ActionResult.Promise) {
      // Promesse obtenue => ouvrir le dialog promesse
      setTimeout(() => setPromiseDialogOpen(true), 300)
    } else if (data.result === ActionResult.PartialPayment || data.result === ActionResult.FullPayment) {
      // Paiement déclaré => ouvrir le dialog paiement
      setPaymentDefaultAmount(undefined)
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
  const { data: extraInfo } = useCaseExtraInfo(id)

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

  const totalAmount = Math.abs(
    (caseData.amount_principal || 0) +
    (caseData.amount_interest || 0) +
    (caseData.amount_penalties || 0) +
    (caseData.amount_fees || 0)
  )

  // Valeurs stockées en base, recalculées par trigger
  const totalPaid = caseData.total_paid ?? 0
  const remainingBalance = caseData.remaining_balance ?? 0

  const debtorName = caseData.debtor_pp
    ? `${caseData.debtor_pp.first_name} ${caseData.debtor_pp.last_name}`
    : caseData.debtor_pm?.company_name || '—'
  const debtorType = caseData.debtor_pp ? 'Personne Physique' : 'Personne Morale'

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
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
          {isAdmin && (
            <Button onClick={() => setEditCaseDialogOpen(true)} variant="outline" className="w-full sm:w-auto">
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
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
            <InfoRow label="Date d'entrée en situation d'impayé" value={formatDate(caseData.default_date)} icon={Calendar} />
            <InfoRow label="Produit" value={caseData.product_type} />
            <InfoRow label="Réf. contrat" value={caseData.contract_reference} />
            <InfoRow label="Traitement" value={CasePhaseLabels[caseData.phase] || caseData.phase} />
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

            {caseData.notes && (() => {
              // Filter out structured notes (shown as colored cards below)
              const plainNotes = String(caseData.notes).split(' | ')
                .filter((n) => !n.trim().startsWith('Nature du Prêt:') && !n.trim().startsWith('Garantie:') && !n.trim().startsWith('Démarches:'))
                .join(' | ')
                .trim()
              if (!plainNotes) return null
              return (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{plainNotes}</p>
                </div>
              )
            })()}
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
                {/* Photo du débiteur */}
                {caseData.debtor_pp.photo_url && (
                  <div className="flex justify-center pb-3">
                    <img
                      src={caseData.debtor_pp.photo_url}
                      alt="Photo du débiteur"
                      className="h-24 w-24 rounded-full object-cover border-2 border-muted shadow-sm"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}

                <InfoRow label="Nom" value={`${caseData.debtor_pp.first_name || ''} ${caseData.debtor_pp.last_name || ''}`.trim()} icon={User} />
                <InfoRow label="N° ID" value={caseData.debtor_pp.id_number} icon={Shield} />
                <InfoRow label="Tél. principal" value={caseData.debtor_pp.phone_primary} icon={Phone} />
                <InfoRow label="Tél. secondaire" value={caseData.debtor_pp.phone_secondary} icon={Phone} />
                <InfoRow label="Email" value={caseData.debtor_pp.email} icon={Mail} />
                <InfoRow label="Pays" value={caseData.debtor_pp.address_city} icon={MapPin} />
                <InfoRow label="Adresse" value={caseData.debtor_pp.address_street} icon={MapPin} />
                <InfoRow label="Employeur" value={caseData.debtor_pp.employer} icon={Building2} />
                <InfoRow label="Emploi" value={caseData.debtor_pp.occupation} icon={Briefcase} />

                {caseData.debtor_pp.alt_contact_name && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Contact alternatif</p>
                    <InfoRow label="Nom" value={caseData.debtor_pp.alt_contact_name} icon={User} />
                    <InfoRow label="Relation" value={caseData.debtor_pp.alt_contact_relation} />
                    <InfoRow label="Tél." value={caseData.debtor_pp.alt_contact_phone} icon={Phone} />
                  </div>
                )}
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
                <span>{formatAmount(Math.abs(caseData.amount_principal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Intérêts / pénalités</span>
                <span>{formatAmount(Math.abs(caseData.amount_interest))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pénalités de retard</span>
                <span>{formatAmount(Math.abs(caseData.amount_penalties))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frais</span>
                <span>{formatAmount(Math.abs(caseData.amount_fees))}</span>
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

      {/* Cartes colorées pour les notes structurées (Nature du Prêt, Garantie, Démarches) */}
      {caseData.notes && (() => {
        const noteParts = String(caseData.notes).split(' | ')
        const noteConfig = [
          { prefix: 'Nature du Prêt:', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', title: 'Nature du Prêt' },
          { prefix: 'Garantie:', icon: ShieldCheck, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', title: 'Garantie' },
          { prefix: 'Démarches:', icon: ClipboardList, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', title: 'Démarches' },
        ]
        const structuredNotes = noteParts
          .map((note) => {
            const trimmed = note.trim()
            const config = noteConfig.find((c) => trimmed.startsWith(c.prefix))
            if (config) {
              return { ...config, content: trimmed.slice(config.prefix.length).trim() }
            }
            return null
          })
          .filter((n): n is NonNullable<typeof n> => n !== null && n.content.length > 0)

        if (structuredNotes.length === 0) return null

        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {structuredNotes.map((note, idx) => {
              const NoteIcon = note.icon
              return (
                <Card key={idx} className={`border ${note.bgColor}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <NoteIcon className={`h-4 w-4 ${note.color}`} />
                      <span className={`text-sm font-semibold ${note.color}`}>{note.title}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      })()}

      {/* Section Informations complémentaires */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            Informations complémentaires
          </CardTitle>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => { setInfoLabel(''); setInfoValue(''); setAddInfoOpen(true) }}>
              <Plus className="mr-1 h-4 w-4" />
              Ajouter
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {extraInfo && extraInfo.length > 0 ? (
            <div className="space-y-2">
              {extraInfo.map((info) => (
                <div key={info.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">{info.label}</p>
                    <p className="text-sm whitespace-pre-wrap">{info.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(info.created_at)}</p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        if (!id) return
                        try {
                          await deleteExtraInfo.mutateAsync({ id: info.id, case_id: id })
                          toast.success('Information supprimée')
                        } catch {
                          toast.error('Erreur lors de la suppression')
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucune information complémentaire
            </p>
          )}
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs defaultValue="actions">
        <TabsList className="w-full grid grid-cols-3">
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
                      <TableHead>Notes</TableHead>
                      {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promises.map((promise) => {
                      const isActionable = promise.status === PromiseStatus.Pending || promise.status === PromiseStatus.Rescheduled
                      const isOverdue = isActionable &&
                        new Date(promise.due_date) < new Date(new Date().toDateString())
                      return (
                        <TableRow key={promise.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-mono text-sm">
                            {promise.reference || '—'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatAmount(promise.amount)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1.5">
                              {formatDate(promise.due_date)}
                              {isOverdue && (
                                <span className="text-destructive" title="Échéance dépassée">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {promise.payment_method || '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={promiseStatusVariant(promise.status)}>
                                {PromiseStatusLabels[promise.status] || promise.status}
                              </Badge>
                              {promise.status === PromiseStatus.Kept && totalPaid < promise.amount && (
                                <button
                                  onClick={() => { setPaymentDefaultAmount(promise.amount); setPaymentDialogOpen(true) }}
                                  className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 border border-orange-300 hover:bg-orange-200 transition-colors cursor-pointer animate-pulse"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  Paiement non déclaré
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {promise.status_notes || '—'}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              {isActionable && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleMarkPromiseKept(promise.id, promise.amount)}>
                                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                      Marquer comme tenue
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleMarkPromiseBroken(promise.id)}>
                                      <XOctagon className="mr-2 h-4 w-4 text-destructive" />
                                      Marquer comme non tenue
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openRescheduleDialog(promise.id)}>
                                      <CalendarClock className="mr-2 h-4 w-4 text-blue-600" />
                                      Replanifier
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => openDeletePromiseDialog(promise.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
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
                <Button size="sm" onClick={() => { setPaymentDefaultAmount(undefined); setPaymentDialogOpen(true) }}>
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
                      {canValidatePayment && <TableHead className="text-right">Actions</TableHead>}
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
                          <div className="flex flex-col gap-1">
                            <Badge variant={paymentStatusVariant(payment.status)}>
                              {PaymentStatusLabels[payment.status] || payment.status}
                            </Badge>
                            {payment.status === 'rejected' && payment.rejection_reason && (
                              <span className="text-xs text-destructive">
                                {payment.rejection_reason}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {canValidatePayment && (
                          <TableCell className="text-right">
                            {payment.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleValidatePayment(payment.id)}
                                  disabled={validatePayment.isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Valider
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => openRejectDialog(payment.id)}
                                  disabled={validatePayment.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Rejeter
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {payment.validated_at ? formatDateTime(payment.validated_at) : '—'}
                              </span>
                            )}
                          </TableCell>
                        )}
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
        onOpenChange={(open) => {
          setPaymentDialogOpen(open)
          if (!open) setPaymentDefaultAmount(undefined)
        }}
        remainingBalance={remainingBalance}
        defaultAmount={paymentDefaultAmount}
      />
      <EditCaseDialog
        caseData={caseData}
        open={editCaseDialogOpen}
        onOpenChange={setEditCaseDialogOpen}
      />

      {/* Dialog de rejet de paiement */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rejeter le paiement</DialogTitle>
            <DialogDescription>
              Indiquez la raison du rejet (optionnel).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Raison du rejet..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectPayment}
              disabled={validatePayment.isPending}
            >
              {validatePayment.isPending ? 'Rejet...' : 'Confirmer le rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de replanification de promesse */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Replanifier la promesse</DialogTitle>
            <DialogDescription>
              Choisissez une nouvelle date d'échéance pour cette promesse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nouvelle date d'échéance *</label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Commentaire</label>
              <Textarea
                placeholder="Raison de la replanification..."
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleReschedulePromise}
              disabled={!rescheduleDate || updatePromiseStatus.isPending}
            >
              {updatePromiseStatus.isPending ? 'Enregistrement...' : 'Replanifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression de promesse */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Supprimer la promesse</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette promesse ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePromise}
              disabled={deletePromise.isPending}
            >
              {deletePromise.isPending ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'ajout d'info complémentaire */}
      <Dialog open={addInfoOpen} onOpenChange={setAddInfoOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Ajouter une information</DialogTitle>
            <DialogDescription>
              Saisissez une information complémentaire collectée sur le débiteur ou le dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type d'information *</label>
              <Select onValueChange={(val) => setInfoLabel(val)} value={infoLabel}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nouveau téléphone">Nouveau téléphone</SelectItem>
                  <SelectItem value="Nouvelle adresse">Nouvelle adresse</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Employeur">Employeur</SelectItem>
                  <SelectItem value="Personne de contact">Personne de contact</SelectItem>
                  <SelectItem value="Observation">Observation</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Détail *</label>
              <Textarea
                placeholder="Ex: +222 36 12 34 56..."
                value={infoValue}
                onChange={(e) => setInfoValue(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInfoOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={!infoLabel || !infoValue.trim() || createExtraInfo.isPending}
              onClick={async () => {
                if (!id || !infoLabel || !infoValue.trim()) return
                try {
                  await createExtraInfo.mutateAsync({ case_id: id, label: infoLabel, value: infoValue.trim() })
                  toast.success('Information ajoutée')
                  setAddInfoOpen(false)
                } catch {
                  toast.error("Erreur lors de l'ajout")
                }
              }}
            >
              {createExtraInfo.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
