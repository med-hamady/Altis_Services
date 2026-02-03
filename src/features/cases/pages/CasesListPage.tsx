import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, FolderKanban } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '@/contexts/AuthContext'
import { useCases } from '../hooks/useCases'
import { CreateCaseDialog } from '../components/CreateCaseDialog'

const statusLabels: Record<string, string> = {
  new: 'Nouveau',
  assigned: 'Affecté',
  in_progress: 'En cours',
  promise: 'Promesse obtenue',
  partial_payment: 'Paiement partiel',
  paid: 'Payé',
  closed: 'Clôturé',
}

const priorityColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
  urgent: 'destructive',
}

export function CasesListPage() {
  const { data: cases, isLoading } = useCases()
  const navigate = useNavigate()
  const { isAdmin, isAgent, isBankUser, bankId } = usePermissions()
  const [showCreateCase, setShowCreateCase] = useState(false)
  const canCreateCase = isAdmin || isBankUser

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAgent ? 'Mes dossiers' : 'Dossiers'}
          </h1>
          <p className="text-muted-foreground">
            {isAgent ? 'Dossiers qui vous sont affectés' : 'Gestion des dossiers de recouvrement'}
          </p>
        </div>
        {canCreateCase && (
          <Button onClick={() => setShowCreateCase(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau dossier
          </Button>
        )}
      </div>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle>{isAgent ? 'Dossiers affectés' : 'Tous les dossiers'}</CardTitle>
          <CardDescription>
            {cases?.length || 0} dossier(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : cases && cases.length > 0 ? (
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
                {cases.map((c) => {
                  const totalAmount =
                    (c.amount_principal || 0) +
                    (c.amount_interest || 0) +
                    (c.amount_penalties || 0) +
                    (c.amount_fees || 0)

                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/cases/${c.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm font-medium">{c.reference}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {c.debtor_pp ? `${c.debtor_pp.first_name} ${c.debtor_pp.last_name}` : c.debtor_pm?.company_name || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        <Badge variant={priorityColors[c.priority] || 'default'}>
                          {c.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Aucun dossier</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isAgent ? 'Aucun dossier ne vous est affecté pour le moment' : 'Commencez par créer un nouveau dossier'}
              </p>
              {canCreateCase && (
                <Button className="mt-4" onClick={() => setShowCreateCase(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau dossier
                </Button>
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
