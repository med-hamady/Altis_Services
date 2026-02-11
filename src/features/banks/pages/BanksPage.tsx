import { useState } from 'react'
import { Plus, Pencil, Trash2, MoreVertical, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useBanks, useDeleteBank, useToggleBankStatus } from '../hooks/useBanks'
import { BankDialog } from '../components/BankDialog'
import type { Bank } from '@/types'

export function BanksPage() {
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: banks, isLoading } = useBanks()
  const deleteBank = useDeleteBank()
  const toggleStatus = useToggleBankStatus()

  const handleCreate = () => {
    setSelectedBank(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (bank: Bank) => {
    setSelectedBank(bank)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette banque ?')) {
      await deleteBank.mutateAsync(id)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await toggleStatus.mutateAsync({ id, isActive: !currentStatus })
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Banques</h1>
          <p className="text-muted-foreground">
            Gestion des banques partenaires
          </p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle banque
        </Button>
      </div>

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des banques</CardTitle>
          <CardDescription>
            {banks?.length || 0} banque(s) enregistrée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : banks && banks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden md:table-cell">Code</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banks.map((bank) => (
                  <TableRow key={bank.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{bank.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {bank.address}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{bank.code}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">
                        <p>{bank.phone}</p>
                        <p className="text-muted-foreground">{bank.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={bank.is_active ? 'default' : 'secondary'}>
                        {bank.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(bank)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(bank.id, bank.is_active)}
                          >
                            {bank.is_active ? 'Désactiver' : 'Activer'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(bank.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Aucune banque</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Commencez par ajouter une banque partenaire
              </p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle banque
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour créer/modifier */}
      <BankDialog
        bank={selectedBank}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}
