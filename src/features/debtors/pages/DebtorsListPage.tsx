import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Search, UserCircle, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDebtorsPPByBank, useDebtorsPMByBank } from '../hooks/useDebtors'
import { useBank } from '@/features/banks/hooks/useBanks'
import { AddDebtorPPDialog } from '../components/AddDebtorPPDialog'
import { AddDebtorPMDialog } from '../components/AddDebtorPMDialog'

export function DebtorsListPage() {
  const { bankId } = useParams<{ bankId: string }>()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('pp')
  const [showAddPP, setShowAddPP] = useState(false)
  const [showAddPM, setShowAddPM] = useState(false)

  const { data: bank } = useBank(bankId ?? null)
  const { data: debtorsPP, isLoading: loadingPP } = useDebtorsPPByBank(bankId!)
  const { data: debtorsPM, isLoading: loadingPM } = useDebtorsPMByBank(bankId!)

  // Filtrer par recherche
  const filteredPP = useMemo(() => {
    if (!debtorsPP) return []
    if (!search) return debtorsPP
    const s = search.toLowerCase()
    return debtorsPP.filter(
      (d) =>
        d.first_name.toLowerCase().includes(s) ||
        d.last_name.toLowerCase().includes(s) ||
        d.email?.toLowerCase().includes(s) ||
        d.phone_primary?.includes(s) ||
        d.id_number?.includes(s)
    )
  }, [debtorsPP, search])

  const filteredPM = useMemo(() => {
    if (!debtorsPM) return []
    if (!search) return debtorsPM
    const s = search.toLowerCase()
    return debtorsPM.filter(
      (d) =>
        d.company_name.toLowerCase().includes(s) ||
        d.rc_number?.toLowerCase().includes(s) ||
        d.nif?.toLowerCase().includes(s) ||
        d.email?.toLowerCase().includes(s) ||
        d.phone_primary?.includes(s)
    )
  }, [debtorsPM, search])

  const totalCount = (debtorsPP?.length || 0) + (debtorsPM?.length || 0)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => navigate('/debtors')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
              Débiteurs — {bank?.name ?? '...'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} débiteur(s) — PP et PM
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau débiteur
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowAddPP(true)}>
              <UserCircle className="mr-2 h-4 w-4" />
              Personne physique
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAddPM(true)}>
              <Building2 className="mr-2 h-4 w-4" />
              Personne morale
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un débiteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs PP / PM */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pp">
            Personnes physiques ({debtorsPP?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pm">
            Personnes morales ({debtorsPM?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Personnes Physiques */}
        <TabsContent value="pp" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personnes physiques</CardTitle>
              <CardDescription>
                {filteredPP.length} débiteur(s) personne(s) physique(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPP ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : filteredPP.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom complet</TableHead>
                      <TableHead>N° identité</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">Ville</TableHead>
                      <TableHead className="hidden lg:table-cell">Profession</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPP.map((debtor) => (
                      <TableRow key={debtor.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {debtor.first_name} {debtor.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {debtor.id_number || '—'}
                          </span>
                        </TableCell>
                        <TableCell>{debtor.phone_primary || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">{debtor.email || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">{debtor.address_city || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {debtor.occupation ? (
                            <Badge variant="outline">{debtor.occupation}</Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserCircle className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">Aucun débiteur PP</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {search ? 'Aucun résultat pour cette recherche.' : 'Aucun débiteur personne physique pour cette banque.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personnes Morales */}
        <TabsContent value="pm" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personnes morales</CardTitle>
              <CardDescription>
                {filteredPM.length} débiteur(s) personne(s) morale(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPM ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : filteredPM.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Raison sociale</TableHead>
                      <TableHead>RC</TableHead>
                      <TableHead className="hidden md:table-cell">NIF</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead className="hidden md:table-cell">Représentant légal</TableHead>
                      <TableHead className="hidden lg:table-cell">Secteur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPM.map((debtor) => (
                      <TableRow key={debtor.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="font-medium">{debtor.company_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {debtor.rc_number || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="font-mono text-sm">
                            {debtor.nif || '—'}
                          </span>
                        </TableCell>
                        <TableCell>{debtor.phone_primary || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {debtor.legal_rep_name ? (
                            <div>
                              <div className="font-medium">{debtor.legal_rep_name}</div>
                              {debtor.legal_rep_title && (
                                <div className="text-xs text-muted-foreground">{debtor.legal_rep_title}</div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {debtor.sector_activity ? (
                            <Badge variant="outline">{debtor.sector_activity}</Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">Aucun débiteur PM</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {search ? 'Aucun résultat pour cette recherche.' : 'Aucun débiteur personne morale pour cette banque.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddDebtorPPDialog open={showAddPP} onOpenChange={setShowAddPP} />
      <AddDebtorPMDialog open={showAddPM} onOpenChange={setShowAddPM} />
    </div>
  )
}
