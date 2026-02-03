import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Building2, Pencil } from 'lucide-react'
import { useBankUsers } from '../hooks/useUsers'
import { BankUserDialog } from './BankUserDialog'
import { EditBankUserDialog } from './EditBankUserDialog'
import type { BankUser } from '@/types'

export function BankUsersTable() {
  const { data: users, isLoading } = useBankUsers()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<BankUser | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Utilisateurs Banque</CardTitle>
            <CardDescription>
              {users?.length || 0} utilisateur(s)
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel utilisateur
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : users && users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom complet</TableHead>
                <TableHead>Banque</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">{user.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.bank?.name || '—'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditUser(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Aucun utilisateur banque</h3>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un utilisateur
            </Button>
          </div>
        )}
      </CardContent>

      <BankUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EditBankUserDialog
        user={editUser}
        open={!!editUser}
        onOpenChange={(open) => { if (!open) setEditUser(null) }}
      />
    </Card>
  )
}
