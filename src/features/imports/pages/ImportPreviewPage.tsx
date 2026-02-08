import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Check,
  X,
  Pencil,
  ExternalLink,
  FolderKanban,
  User,
  Building2,
  Banknote,
  Phone,
  Mail,
  MapPin,
  Shield,
  Briefcase,
  Calendar,
} from 'lucide-react'
import {
  useImport,
  useImportRows,
  useToggleRowApproval,
  useApproveAllValidRows,
  useUpdateImportRow,
  useFinalizeImport,
  useCasesByImport,
} from '../hooks/useImports'
import { ImportStatus, ImportStatusLabels } from '@/types/enums'
import type { ImportRow } from '@/types'
import { toast } from 'sonner'

type FilterType = 'all' | 'ok' | 'warnings' | 'errors'

function getRowStatus(row: ImportRow): 'ok' | 'warnings' | 'errors' {
  if (row.errors && row.errors.length > 0) return 'errors'
  if (row.warnings && row.warnings.length > 0) return 'warnings'
  return 'ok'
}

const formatAmountFn = (amount: unknown) => {
  const num = Number(amount)
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MRU',
    minimumFractionDigits: 0,
  }).format(num)
}

// ---------------------------------------------------------------------------
// InfoRow — identique à CaseDetailPage
// ---------------------------------------------------------------------------
function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | null | undefined
  icon?: React.ComponentType<{ className?: string }>
}) {
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

// ---------------------------------------------------------------------------
// EditableInfoRow — InfoRow avec édition inline au clic
// ---------------------------------------------------------------------------
function EditableInfoRow({
  label,
  value,
  fieldKey,
  rowId,
  onSave,
  icon: Icon,
}: {
  label: string
  value: string | null | undefined
  fieldKey: string
  rowId: string
  onSave: (rowId: string, field: string, value: string) => void
  icon?: React.ComponentType<{ className?: string }>
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')

  if (!editing) {
    return (
      <div
        className="group flex items-start gap-3 py-1.5 cursor-pointer"
        onClick={() => {
          setEditValue(value || '')
          setEditing(true)
        }}
      >
        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="flex items-center gap-1">
            <p className="text-sm">{value || '—'}</p>
            <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 py-1.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSave(rowId, fieldKey, editValue)
                setEditing(false)
              }
              if (e.key === 'Escape') setEditing(false)
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => {
              onSave(rowId, fieldKey, editValue)
              setEditing(false)
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setEditing(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditableAmountRow — montant editable dans la carte Dette
// ---------------------------------------------------------------------------
function EditableAmountRow({
  label,
  value,
  fieldKey,
  rowId,
  onSave,
}: {
  label: string
  value: string
  fieldKey: string
  rowId: string
  onSave: (rowId: string, field: string, value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  if (!editing) {
    return (
      <div
        className="group flex justify-between text-sm cursor-pointer py-1"
        onClick={() => {
          setEditValue(value)
          setEditing(true)
        }}
      >
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <span>{formatAmountFn(value)}</span>
          <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between text-sm py-1 gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="h-7 w-[120px] text-sm text-right"
          type="number"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSave(rowId, fieldKey, editValue)
              setEditing(false)
            }
            if (e.key === 'Escape') setEditing(false)
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => {
            onSave(rowId, fieldKey, editValue)
            setEditing(false)
          }}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setEditing(false)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CasePreviewCard — reproduit le design exact de CaseDetailPage
// ---------------------------------------------------------------------------
function CasePreviewCard({
  row,
  isReadOnly,
  bankName,
  onToggleApproval,
  onInlineSave,
}: {
  row: ImportRow
  isReadOnly: boolean
  bankName: string
  onToggleApproval: (rowId: string, current: boolean) => void
  onInlineSave: (rowId: string, field: string, value: string) => void
}) {
  const d = row.proposed_json
  const status = getRowStatus(row)
  const hasErrors = status === 'errors'
  const isPM = d.debtor_type === 'pm'

  const total =
    (Number(d.amount_principal) || 0) +
    (Number(d.amount_interest) || 0) +
    (Number(d.amount_penalties) || 0) +
    (Number(d.amount_fees) || 0)
  const displayTotal = total || Number(d.total_due) || 0

  const debtorName = isPM
    ? String(d.debtor_name ?? '—')
    : d.debtor_first_name
      ? `${d.debtor_first_name} ${d.debtor_name ?? ''}`
      : String(d.debtor_name ?? '—')

  const debtorType = isPM ? 'Personne Morale' : 'Personne Physique'

  const borderColor =
    hasErrors
      ? 'border-red-300 dark:border-red-800'
      : status === 'warnings'
        ? 'border-yellow-300 dark:border-yellow-800'
        : row.is_approved
          ? 'border-green-300 dark:border-green-800'
          : ''

  const bgColor =
    hasErrors
      ? 'bg-red-50/30 dark:bg-red-950/10'
      : status === 'warnings'
        ? 'bg-yellow-50/20 dark:bg-yellow-950/10'
        : row.is_approved
          ? 'bg-green-50/20 dark:bg-green-950/10'
          : ''

  // Helper for editable or read-only
  const Field = ({
    label,
    value,
    fieldKey,
    icon,
  }: {
    label: string
    value: string | null | undefined
    fieldKey: string
    icon?: React.ComponentType<{ className?: string }>
  }) => {
    if (isReadOnly || hasErrors) {
      return <InfoRow label={label} value={value} icon={icon} />
    }
    return (
      <EditableInfoRow
        label={label}
        value={value}
        fieldKey={fieldKey}
        rowId={row.id}
        onSave={onInlineSave}
        icon={icon}
      />
    )
  }

  // Helper for editable amount rows in Dette card
  const AmountField = ({
    label,
    value,
    fieldKey,
  }: {
    label: string
    value: string
    fieldKey: string
  }) => {
    if (isReadOnly || hasErrors) {
      return (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span>{formatAmountFn(value)}</span>
        </div>
      )
    }
    return (
      <EditableAmountRow
        label={label}
        value={value}
        fieldKey={fieldKey}
        rowId={row.id}
        onSave={onInlineSave}
      />
    )
  }

  return (
    <div className={`rounded-lg border p-4 ${borderColor} ${bgColor}`}>
      {/* --- En-tête : checkbox + statut + type + nom + badges --- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          {!isReadOnly && (
            <input
              type="checkbox"
              checked={row.is_approved}
              disabled={hasErrors}
              onChange={() => onToggleApproval(row.id, row.is_approved)}
              className="h-5 w-5 shrink-0 rounded border-gray-300"
            />
          )}

          {/* Status icon */}
          {status === 'ok' && <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />}
          {status === 'warnings' && <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />}
          {status === 'errors' && <XCircle className="h-5 w-5 shrink-0 text-red-600" />}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">#{row.row_number}</span>
              <h3 className="text-lg font-bold tracking-tight">{debtorName}</h3>
              <Badge variant="outline">{debtorType}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {bankName} &middot; {formatAmountFn(displayTotal)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              d.priority === 'high' || d.priority === 'urgent'
                ? 'destructive'
                : d.priority === 'low'
                  ? 'secondary'
                  : 'default'
            }
          >
            {String(d.priority ?? 'medium')}
          </Badge>
          {d.treatment_type ? (
            <Badge variant="outline">{String(d.treatment_type)}</Badge>
          ) : null}
        </div>
      </div>

      {/* --- Warnings / Erreurs (au-dessus des cartes) --- */}
      {((row.errors && row.errors.length > 0) || (row.warnings && row.warnings.length > 0)) && (
        <div className="mb-4 space-y-1 rounded-md border p-3 bg-background">
          {row.errors?.map((e, i) => (
            <p key={`e-${i}`} className="text-xs text-red-600 flex items-center gap-1">
              <XCircle className="h-3 w-3 shrink-0" />
              <span className="font-medium">{e.field}:</span> {e.message}
            </p>
          ))}
          {row.warnings?.map((w, i) => (
            <p key={`w-${i}`} className="text-xs text-yellow-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="font-medium">{w.field}:</span> {w.message}
            </p>
          ))}
        </div>
      )}

      {/* --- Grille 3 cartes identique à CaseDetailPage --- */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Card 1 : Informations du dossier */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Informations du dossier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="Banque" value={bankName} icon={Building2} />
            <Field label="Réf. banque" value={String(d.bank_reference ?? '')} fieldKey="bank_reference" />
            <Field label="Date d'ouverture" value={String(d.open_date ?? '')} fieldKey="open_date" icon={Calendar} />
            <Field label="Date de défaut" value={String(d.default_date ?? '')} fieldKey="default_date" icon={Calendar} />
            <Field label="Produit" value={String(d.product_type ?? '')} fieldKey="product_type" />
            <Field label="Réf. contrat" value={String(d.contract_ref ?? '')} fieldKey="contract_ref" />

            {/* Solde restant */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Solde restant</span>
                <span className="text-sm font-semibold text-destructive">
                  {formatAmountFn(d.remaining_balance || displayTotal)}
                </span>
              </div>
            </div>

            <Field label="Notes" value={String(d.notes ?? '')} fieldKey="notes" />
          </CardContent>
        </Card>

        {/* Card 2 : Débiteur */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Débiteur — {debtorType}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isPM ? (
              <>
                <Field label="Société" value={String(d.debtor_name ?? '')} fieldKey="debtor_name" icon={Building2} />
                <Field label="RC" value={String(d.rc_number ?? '')} fieldKey="rc_number" icon={Shield} />
                <Field label="NIF" value={String(d.nif ?? '')} fieldKey="nif" icon={Shield} />
                <Field label="Représentant légal" value={String(d.legal_rep_name ?? '')} fieldKey="legal_rep_name" icon={User} />
                <Field label="Fonction" value={String(d.legal_rep_title ?? '')} fieldKey="legal_rep_title" />
                <Field label="Tél. représentant" value={String(d.legal_rep_phone ?? '')} fieldKey="legal_rep_phone" icon={Phone} />
                <Field label="Tél. principal" value={String(d.phone_1 ?? '')} fieldKey="phone_1" icon={Phone} />
                <Field label="Tél. secondaire" value={String(d.phone_2 ?? '')} fieldKey="phone_2" icon={Phone} />
                <Field label="Email" value={String(d.email ?? '')} fieldKey="email" icon={Mail} />
                <Field label="Adresse" value={String(d.address ?? '')} fieldKey="address" icon={MapPin} />
                <Field label="Ville" value={String(d.city ?? '')} fieldKey="city" />
                <Field label="Secteur" value={String(d.sector ?? '')} fieldKey="sector" />
                <Field label="Région" value={String(d.region ?? '')} fieldKey="region" />
              </>
            ) : (
              <>
                <Field label="Nom" value={String(d.debtor_name ?? '')} fieldKey="debtor_name" icon={User} />
                <Field label="Prénom" value={String(d.debtor_first_name ?? '')} fieldKey="debtor_first_name" />
                <Field label="Type ID" value={String(d.id_type ?? '')} fieldKey="id_type" icon={Shield} />
                <Field label="N° ID" value={String(d.id_number ?? '')} fieldKey="id_number" icon={Shield} />
                <Field label="Tél. principal" value={String(d.phone_1 ?? '')} fieldKey="phone_1" icon={Phone} />
                <Field label="Tél. secondaire" value={String(d.phone_2 ?? '')} fieldKey="phone_2" icon={Phone} />
                <Field label="Email" value={String(d.email ?? '')} fieldKey="email" icon={Mail} />
                <Field label="Adresse" value={String(d.address ?? '')} fieldKey="address" icon={MapPin} />
                <Field label="Ville" value={String(d.city ?? '')} fieldKey="city" />
                <Field label="Secteur" value={String(d.sector ?? '')} fieldKey="sector" />
                <Field label="Région" value={String(d.region ?? '')} fieldKey="region" />
                <Field label="Employeur" value={String(d.employer ?? '')} fieldKey="employer" icon={Briefcase} />
                <Field label="Profession" value={String(d.occupation ?? '')} fieldKey="occupation" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 3 : Dette */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4" />
              Dette
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <AmountField label="Montant principal" value={String(d.amount_principal ?? '0')} fieldKey="amount_principal" />
              <AmountField label="Intérêts / pénalités" value={String(d.amount_interest ?? '0')} fieldKey="amount_interest" />
              <AmountField label="Pénalités de retard" value={String(d.amount_penalties ?? '0')} fieldKey="amount_penalties" />
              <AmountField label="Frais" value={String(d.amount_fees ?? '0')} fieldKey="amount_fees" />
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total dû</span>
                <span>{formatAmountFn(displayTotal)}</span>
              </div>
            </div>

            {/* Garantie */}
            <div className="mt-4 pt-3 border-t space-y-1">
              <Field label="Type garantie" value={String(d.guarantee_type ?? '')} fieldKey="guarantee_type" />
              <Field label="Description garantie" value={String(d.guarantee_description ?? '')} fieldKey="guarantee_description" />
            </div>

            <Field label="Devise" value={String(d.currency ?? '')} fieldKey="currency" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export function ImportPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: importData, isLoading: importLoading } = useImport(id || null)
  const { data: rows, isLoading: rowsLoading } = useImportRows(id || null)
  const { data: createdCases, isLoading: casesLoading } = useCasesByImport(id || null, importData?.status)
  const toggleApproval = useToggleRowApproval()
  const approveAll = useApproveAllValidRows()
  const updateRow = useUpdateImportRow()
  const finalizeImport = useFinalizeImport()

  const [filter, setFilter] = useState<FilterType>('all')
  const [isFinalizing, setIsFinalizing] = useState(false)

  const filteredRows = useMemo(() => {
    if (!rows) return []
    if (filter === 'all') return rows
    return rows.filter((r) => getRowStatus(r) === filter)
  }, [rows, filter])

  const stats = useMemo(() => {
    if (!rows) return { ok: 0, warnings: 0, errors: 0, approved: 0 }
    return {
      ok: rows.filter((r) => getRowStatus(r) === 'ok').length,
      warnings: rows.filter((r) => getRowStatus(r) === 'warnings').length,
      errors: rows.filter((r) => getRowStatus(r) === 'errors').length,
      approved: rows.filter((r) => r.is_approved).length,
    }
  }, [rows])

  const handleToggleApproval = async (rowId: string, current: boolean) => {
    try {
      await toggleApproval.mutateAsync({ rowId, isApproved: !current })
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleApproveAll = async () => {
    if (!id) return
    try {
      await approveAll.mutateAsync(id)
      toast.success('Toutes les lignes valides ont été approuvées')
    } catch {
      toast.error('Erreur lors de l\'approbation')
    }
  }

  const handleInlineSave = async (rowId: string, field: string, value: string) => {
    const row = rows?.find((r) => r.id === rowId)
    if (!row) return

    const updated = { ...row.proposed_json, [field]: value }
    try {
      await updateRow.mutateAsync({ rowId, proposedJson: updated })
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleFinalize = async () => {
    if (!id || !rows) return

    const approvedRows = rows.filter((r) => r.is_approved)
    if (approvedRows.length === 0) {
      toast.error('Aucune ligne approuvée')
      return
    }

    const approvedRowIds = approvedRows.map((r) => r.id)

    setIsFinalizing(true)
    try {
      const result = await finalizeImport.mutateAsync({ importId: id, approvedRowIds })
      toast.success(`${result.created_count} dossier(s) créé(s) avec succès !`)
      if (result.error_count > 0) {
        toast.error(`${result.error_count} erreur(s) lors de la création`)
      }
      navigate('/imports')
    } catch (err) {
      toast.error(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
    } finally {
      setIsFinalizing(false)
    }
  }

  if (importLoading || rowsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!importData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/imports')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <p className="text-muted-foreground">Import introuvable</p>
      </div>
    )
  }

  const canFinalize = importData.status === 'ready_for_review' || importData.status === 'failed'
  const isReadOnly = !canFinalize

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/imports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Preview import</h1>
            <p className="text-muted-foreground">
              {importData.bank?.name} — {importData.file_name || 'fichier.xlsx'}
            </p>
          </div>
        </div>
        <Badge variant={importData.status === 'approved' ? 'default' : 'outline'}>
          {ImportStatusLabels[importData.status as ImportStatus] || importData.status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="cursor-pointer" onClick={() => setFilter('all')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{rows?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total lignes</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter('ok')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-2xl font-bold text-green-600">
              <CheckCircle className="h-5 w-5" />{stats.ok}
            </div>
            <p className="text-xs text-muted-foreground">Valides</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter('warnings')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-2xl font-bold text-yellow-600">
              <AlertTriangle className="h-5 w-5" />{stats.warnings}
            </div>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setFilter('errors')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-2xl font-bold text-red-600">
              <XCircle className="h-5 w-5" />{stats.errors}
            </div>
            <p className="text-xs text-muted-foreground">Erreurs</p>
          </CardContent>
        </Card>
      </div>

      {/* Résumé + liste dossiers créés quand import validé */}
      {importData.status === 'approved' && (
        <>
          <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/10">
            <CardContent className="flex items-center gap-4 py-6">
              <CheckCircle className="h-10 w-10 shrink-0 text-green-600" />
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  {createdCases?.length || 0} dossier(s) créé(s) avec succès
                </h2>
                <p className="text-sm text-muted-foreground">
                  Import validé le{' '}
                  {importData.approved_at
                    ? new Date(importData.approved_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </p>
                {importData.error_message && (
                  <p className="mt-1 text-xs text-yellow-600">{importData.error_message}</p>
                )}
              </div>
              <Button variant="outline" onClick={() => navigate('/cases')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Voir tous les dossiers
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dossiers créés</CardTitle>
              <CardDescription>
                {createdCases?.length || 0} dossier(s) créé(s) à partir de cet import
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {casesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : createdCases && createdCases.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Débiteur</TableHead>
                      <TableHead>Banque</TableHead>
                      <TableHead>Montant total</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Priorité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {createdCases.map((c) => {
                      const caseTotal =
                        (Number(c.amount_principal) || 0) +
                        (Number(c.amount_interest) || 0) +
                        (Number(c.amount_penalties) || 0) +
                        (Number(c.amount_fees) || 0)

                      const debtorPp = c.debtor_pp as { first_name?: string; last_name?: string } | null
                      const debtorPm = c.debtor_pm as { company_name?: string } | null
                      const debtorLabel = debtorPm
                        ? debtorPm.company_name || '—'
                        : debtorPp
                          ? `${debtorPp.first_name || ''} ${debtorPp.last_name || ''}`.trim() || '—'
                          : '—'

                      const bank = c.bank as { name?: string } | null

                      const priorityColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
                        low: 'secondary',
                        medium: 'default',
                        high: 'destructive',
                        urgent: 'destructive',
                      }

                      return (
                        <TableRow
                          key={String(c.id)}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/cases/${c.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FolderKanban className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm font-medium">
                                {String(c.reference)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">
                              {debtorLabel}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[150px] truncate">
                              {bank?.name || importData.bank?.name || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatAmountFn(caseTotal)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {String(c.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={priorityColors[String(c.priority ?? 'medium')] || 'default'}>
                              {String(c.priority)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  Aucun dossier trouvé pour cet import.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Actions */}
      {!isReadOnly && importData.status !== 'approved' && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {stats.approved} dossier(s) approuvé(s) sur {rows?.length || 0}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleApproveAll} disabled={approveAll.isPending}>
              {approveAll.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Approuver toutes les valides
            </Button>
            <Button onClick={handleFinalize} disabled={isFinalizing || stats.approved === 0}>
              {isFinalizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Valider & créer {stats.approved} dossier(s)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Liste des dossiers en cartes (masquée quand validé) */}
      {importData.status !== 'approved' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Dossiers à valider
              {filter !== 'all' && (
                <Button variant="ghost" size="sm" className="ml-2" onClick={() => setFilter('all')}>
                  Voir tout
                </Button>
              )}
            </h2>
            <span className="text-sm text-muted-foreground">
              {filteredRows.length} dossier(s) affiché(s)
            </span>
          </div>

          <div className="space-y-6">
            {filteredRows.map((row) => (
              <CasePreviewCard
                key={row.id}
                row={row}
                isReadOnly={isReadOnly}
                bankName={importData.bank?.name || '—'}
                onToggleApproval={handleToggleApproval}
                onInlineSave={handleInlineSave}
              />
            ))}

            {filteredRows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun dossier pour ce filtre
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
