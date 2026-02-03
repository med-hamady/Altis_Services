import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Shield, Pencil } from 'lucide-react'
import { useAdmins } from '../hooks/useUsers'
import { EditAdminDialog } from './EditAdminDialog'
import type { Admin } from '@/types'

export function AdminsTable() {
  const { data: admins, isLoading } = useAdmins()
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Administrateurs</CardTitle>
            <CardDescription>
              {admins?.length || 0} administrateur(s)
            </CardDescription>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel admin
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : admins && admins.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom complet</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium">{admin.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{admin.phone || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                      {admin.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditAdmin(admin)}
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
            <Shield className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Aucun administrateur</h3>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Créer un admin
            </Button>
          </div>
        )}
      </CardContent>

      <EditAdminDialog
        admin={editAdmin}
        open={!!editAdmin}
        onOpenChange={(open) => { if (!open) setEditAdmin(null) }}
      />
    </Card>
  )
}
