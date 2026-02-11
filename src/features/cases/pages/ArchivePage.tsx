import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Archive, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '@/contexts/AuthContext'
import { useArchivedCases } from '../hooks/useCases'
import { useBanks } from '@/features/banks/hooks/useBanks'
import { ClosureReasonLabels } from '@/types/enums'
import type { ClosureReason } from '@/types/enums'

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

export function ArchivePage() {
  const { data: cases, isLoading } = useArchivedCases()
  const { data: banks } = useBanks()
  const navigate = useNavigate()
  const { isBankUser } = usePermissions()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBankId, setSelectedBankId] = useState<string>('all')
  const [selectedReason, setSelectedReason] = useState<string>('all')

  const filteredCases = useMemo(() => {
    if (!cases) return []

    return cases.filter((c) => {
      if (selectedBankId !== 'all' && c.bank_id !== selectedBankId) return false
      if (selectedReason !== 'all' && c.closure_reason !== selectedReason) return false

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
  }, [cases, selectedBankId, selectedReason, searchQuery])

  const hasActiveFilters = selectedBankId !== 'all' || selectedReason !== 'all' || searchQuery !== ''

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedBankId('all')
    setSelectedReason('all')
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Archive</h1>
        <p className="text-muted-foreground">Dossiers clôturés</p>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Rechercher</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Référence, débiteur, banque..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {!isBankUser && (
              <div className="w-full sm:w-[200px] space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Banque</label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
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

            <div className="w-full sm:w-[200px] space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Motif de clôture</label>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les motifs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les motifs</SelectItem>
                  {Object.entries(ClosureReasonLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          <CardTitle>Dossiers clôturés</CardTitle>
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
                  <TableHead>Motif</TableHead>
                  <TableHead className="hidden sm:table-cell">Date clôture</TableHead>
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
                          <Archive className="h-4 w-4 text-muted-foreground" />
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
                        <Badge variant="secondary">
                          {c.closure_reason ? ClosureReasonLabels[c.closure_reason as ClosureReason] || c.closure_reason : '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {formatDate(c.closed_at)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Archive className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">
                {hasActiveFilters ? 'Aucun résultat' : 'Aucun dossier archivé'}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Aucun dossier ne correspond aux filtres sélectionnés'
                  : 'Les dossiers clôturés apparaîtront ici'}
              </p>
              {hasActiveFilters && (
                <Button className="mt-4" variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Effacer les filtres
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
