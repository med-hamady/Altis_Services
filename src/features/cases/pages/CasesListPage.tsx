import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, FolderKanban, Search, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePermissions } from '@/contexts/AuthContext'
import { useCases } from '../hooks/useCases'
import { useBanks } from '@/features/banks/hooks/useBanks'
import { CreateCaseDialog } from '../components/CreateCaseDialog'

const statusLabels: Record<string, string> = {
  new: 'Nouveau',
  assigned: 'Affecté',
  in_progress: 'En cours',
  promise: 'Promesse obtenue',
  partial_payment: 'Paiement partiel',
  paid: 'Payé',
}

export function CasesListPage() {
  const { data: cases, isLoading } = useCases()
  const { data: banks } = useBanks()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAdmin, isAgent, isBankUser, bankId } = usePermissions()
  const [showCreateCase, setShowCreateCase] = useState(false)
  const canCreateCase = isAdmin || isBankUser

  // Filtres persistés dans l'URL
  const searchQuery = searchParams.get('q') || ''
  const selectedBankId = searchParams.get('bank') || 'all'
  const selectedStatus = searchParams.get('status') || 'all'

  const updateFilter = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      if (value === 'all' || value === '') {
        prev.delete(key)
      } else {
        prev.set(key, value)
      }
      return prev
    }, { replace: true })
  }, [setSearchParams])
  // Filtrage des dossiers
  const filteredCases = useMemo(() => {
    if (!cases) return []

    return cases.filter((c) => {
      // Filtre par banque
      if (selectedBankId !== 'all' && c.bank_id !== selectedBankId) return false

      // Filtre par statut
      if (selectedStatus !== 'all' && c.status !== selectedStatus) return false

      // Filtre par recherche (référence, nom débiteur)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const reference = c.reference?.toLowerCase() || ''
        const debtorName = c.debtor_pp
          ? `${c.debtor_pp.first_name} ${c.debtor_pp.last_name}`.toLowerCase()
          : c.debtor_pm?.company_name?.toLowerCase() || ''
        const bankName = c.bank?.name?.toLowerCase() || ''

        if (!reference.includes(query) && !debtorName.includes(query) && !bankName.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [cases, selectedBankId, selectedStatus, searchQuery])

  const hasActiveFilters = selectedBankId !== 'all' || selectedStatus !== 'all' || searchQuery !== ''

  const clearFilters = () => {
    setSearchParams({}, { replace: true })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isAgent ? 'Mes dossiers' : 'Dossiers'}
          </h1>
          <p className="text-muted-foreground">
            {isAgent ? 'Dossiers qui vous sont affectés' : 'Gestion des dossiers de recouvrement'}
          </p>
        </div>
        {canCreateCase && (
          <Button onClick={() => setShowCreateCase(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau dossier
          </Button>
        )}
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Recherche */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Rechercher</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Référence, débiteur, banque..."
                  value={searchQuery}
                  onChange={(e) => updateFilter('q', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filtre par banque */}
            {!isBankUser && (
              <div className="w-full sm:w-[200px] space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Banque</label>
                <Select value={selectedBankId} onValueChange={(v) => updateFilter('bank', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les banques" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les banques</SelectItem>
                    {banks?.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtre par statut */}
            <div className="w-full sm:w-[180px] space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Statut</label>
              <Select value={selectedStatus} onValueChange={(v) => updateFilter('status', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bouton effacer */}
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle>{isAgent ? 'Dossiers affectés' : 'Tous les dossiers'}</CardTitle>
          <CardDescription>
            {filteredCases.length} dossier(s){hasActiveFilters && ` (sur ${cases?.length || 0} au total)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : filteredCases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Débiteur</TableHead>
                  <TableHead className="hidden md:table-cell">Banque</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((c) => {
                  const totalAmount = Math.abs(
                    (c.amount_principal || 0) +
                    (c.amount_interest || 0) +
                    (c.amount_penalties || 0) +
                    (c.amount_fees || 0)
                  )

                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/cases/${c.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm font-medium">{c.reference}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[120px] sm:max-w-[200px] truncate">
                          {c.debtor_pp ? `${c.debtor_pp.first_name} ${c.debtor_pp.last_name}` : c.debtor_pm?.company_name || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="max-w-[150px] truncate">
                          {c.bank?.name || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatAmount(totalAmount)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{statusLabels[c.status] || c.status}</span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                {hasActiveFilters ? 'Aucun résultat' : 'Aucun dossier'}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Aucun dossier ne correspond aux filtres sélectionnés'
                  : isAgent
                    ? 'Aucun dossier ne vous est affecté pour le moment'
                    : 'Commencez par créer un nouveau dossier'}
              </p>
              {hasActiveFilters ? (
                <Button className="mt-4" variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Effacer les filtres
                </Button>
              ) : (
                canCreateCase && (
                  <Button className="mt-4" onClick={() => setShowCreateCase(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau dossier
                  </Button>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCaseDialog
        open={showCreateCase}
        onOpenChange={setShowCreateCase}
        bankId={isBankUser ? (bankId ?? undefined) : undefined}
      />
    </div>
  )
}
