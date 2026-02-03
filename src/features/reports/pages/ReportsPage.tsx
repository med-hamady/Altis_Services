import { Download, Filter, BarChart3, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
          <p className="text-muted-foreground">
            Générez et exportez des rapports
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" className="w-auto" />
              <span className="text-muted-foreground">à</span>
              <Input type="date" className="w-auto" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Plus de filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aperçu des rapports */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rapport par statut</CardTitle>
            <CardDescription>
              Répartition des dossiers par statut
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Aucune donnée disponible
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rapport de recouvrement</CardTitle>
            <CardDescription>
              Montants recouvrés sur la période
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Aucune donnée disponible
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
