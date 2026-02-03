import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Landmark, Users } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useBanks } from '@/features/banks/hooks/useBanks'
import { useDebtorCountsByBank } from '../hooks/useDebtors'
import { usePermissions } from '@/contexts/AuthContext'

export function DebtorsBankSelectionPage() {
  const navigate = useNavigate()
  const { isBankUser, bankId } = usePermissions()
  const { data: banks, isLoading: loadingBanks } = useBanks()
  const { data: counts } = useDebtorCountsByBank()

  // Bank user : rediriger directement vers sa banque
  useEffect(() => {
    if (isBankUser && bankId) {
      navigate(`/debtors/${bankId}`, { replace: true })
    }
  }, [isBankUser, bankId, navigate])

  const activeBanks = banks?.filter((b) => b.is_active) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Débiteurs</h1>
        <p className="text-muted-foreground">
          Sélectionnez une banque pour voir ses débiteurs
        </p>
      </div>

      {loadingBanks ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Chargement des banques...</p>
        </div>
      ) : activeBanks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeBanks.map((bank) => {
            const bankCounts = counts?.[bank.id]
            const totalDebtors = (bankCounts?.pp ?? 0) + (bankCounts?.pm ?? 0)

            return (
              <Card
                key={bank.id}
                className="cursor-pointer transition-colors hover:border-primary hover:shadow-md"
                onClick={() => navigate(`/debtors/${bank.id}`)}
              >
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Landmark className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-base">{bank.name}</CardTitle>
                    {bank.code && (
                      <CardDescription className="font-mono text-xs">
                        {bank.code}
                      </CardDescription>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{totalDebtors} débiteur(s)</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="secondary">
                      {bankCounts?.pp ?? 0} PP
                    </Badge>
                    <Badge variant="outline">
                      {bankCounts?.pm ?? 0} PM
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Landmark className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Aucune banque active</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajoutez des banques depuis la page Banques pour commencer.
          </p>
        </div>
      )}
    </div>
  )
}
