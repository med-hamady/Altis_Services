import { useState } from 'react'
import { Plus, Search, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function BanksListPage() {
  const [search, setSearch] = useState('')

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banques</h1>
          <p className="text-muted-foreground">
            Gérez les banques clientes
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle banque
        </Button>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une banque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Liste des banques (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des banques</CardTitle>
          <CardDescription>
            Toutes les banques clientes enregistrées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Aucune banque</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Commencez par ajouter votre première banque cliente.
            </p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une banque
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
