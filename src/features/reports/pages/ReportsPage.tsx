import { useState } from 'react'
import { FileText, Download, Building2, FolderKanban, Banknote, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBanks } from '@/features/banks/hooks/useBanks'
import { useCasesByBank, useBankStats } from '../hooks/useReports'
import { generateBankReportPdf } from '../utils/generatePdf'

const statusLabels: Record<string, string> = {
  new: 'Nouveau',
  assigned: 'Affecté',
  in_progress: 'En cours',
  promise: 'Promesse',
  partial_payment: 'Paiement partiel',
  paid: 'Payé',
  closed: 'Clôturé',
}

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
}

export function ReportsPage() {
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: banks, isLoading: banksLoading } = useBanks()
  const { data: cases, isLoading: casesLoading } = useCasesByBank(selectedBankId)
  const { data: stats, isLoading: statsLoading } = useBankStats(selectedBankId)

  const selectedBank = banks?.find((b) => b.id === selectedBankId)
  const isLoading = casesLoading || statsLoading

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' MRU'
  }

  const handleGeneratePdf = async () => {
    if (!selectedBank || !cases || !stats) return

    setIsGenerating(true)

    try {
      await generateBankReportPdf({
        bankName: selectedBank.name,
        bankLogoUrl: selectedBank.logo_url,
        generatedAt: new Date(),
        cases,
        stats,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports</h1>
          <p className="text-muted-foreground">
            Générez des rapports PDF par banque
          </p>
        </div>
      </div>

      {/* Sélection de banque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Sélectionner une banque
          </CardTitle>
          <CardDescription>
            Choisissez la banque pour laquelle vous souhaitez générer un rapport
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select
                value={selectedBankId || ''}
                onValueChange={(value) => setSelectedBankId(value || null)}
                disabled={banksLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une banque..." />
                </SelectTrigger>
                <SelectContent>
                  {banks?.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGeneratePdf}
              disabled={!selectedBankId || isLoading || !cases?.length || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Générer le rapport PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aperçu des données */}
      {selectedBankId && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats && cases ? (
            <>
              {/* Statistiques */}
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total dossiers</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <FolderKanban className="h-5 w-5 text-primary" />
                      {stats.totalCases}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Montant total</CardDescription>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-primary" />
                      {formatAmount(stats.totalAmount)}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Principal</CardDescription>
                    <CardTitle className="text-xl">
                      {formatAmount(stats.totalPrincipal)}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total payé</CardDescription>
                    <CardTitle className="text-xl text-green-600">
                      {formatAmount(stats.totalPaid)}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Solde restant</CardDescription>
                    <CardTitle className="text-xl text-destructive">
                      {formatAmount(stats.totalRemainingBalance)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Répartitions */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Par statut */}
                <Card>
                  <CardHeader>
                    <CardTitle>Répartition par statut</CardTitle>
                    <CardDescription>
                      Distribution des dossiers selon leur état
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(stats.byStatus).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(stats.byStatus).map(([status, count]) => {
                          const percentage = ((count / stats.totalCases) * 100).toFixed(1)
                          return (
                            <div key={status} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{statusLabels[status] || status}</span>
                                <span className="text-muted-foreground">
                                  {count} ({percentage}%)
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune donnée
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Par priorité */}
                <Card>
                  <CardHeader>
                    <CardTitle>Répartition par priorité</CardTitle>
                    <CardDescription>
                      Distribution des dossiers selon leur urgence
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(stats.byPriority).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(stats.byPriority).map(([priority, count]) => {
                          const percentage = ((count / stats.totalCases) * 100).toFixed(1)
                          const colorClass =
                            priority === 'urgent' || priority === 'high'
                              ? 'bg-destructive'
                              : priority === 'medium'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          return (
                            <div key={priority} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{priorityLabels[priority] || priority}</span>
                                <span className="text-muted-foreground">
                                  {count} ({percentage}%)
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full transition-all ${colorClass}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune donnée
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Aperçu de la liste */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Aperçu des dossiers ({cases.length})
                  </CardTitle>
                  <CardDescription>
                    Les 10 premiers dossiers qui seront inclus dans le rapport
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {cases.length > 0 ? (
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Référence</th>
                            <th className="px-4 py-2 text-left font-medium">Débiteur</th>
                            <th className="px-4 py-2 text-right font-medium">Montant</th>
                            <th className="px-4 py-2 text-left font-medium">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cases.slice(0, 10).map((c) => {
                            const debtorName = c.debtor_pp
                              ? `${c.debtor_pp.first_name} ${c.debtor_pp.last_name}`
                              : c.debtor_pm?.company_name || '—'
                            const totalAmount =
                              (c.amount_principal || 0) +
                              (c.amount_interest || 0) +
                              (c.amount_penalties || 0) +
                              (c.amount_fees || 0)

                            return (
                              <tr key={c.id} className="border-t">
                                <td className="px-4 py-2 font-mono">{c.reference}</td>
                                <td className="px-4 py-2">{debtorName}</td>
                                <td className="px-4 py-2 text-right">{formatAmount(totalAmount)}</td>
                                <td className="px-4 py-2">{statusLabels[c.status] || c.status}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {cases.length > 10 && (
                        <div className="px-4 py-2 text-sm text-muted-foreground text-center border-t bg-muted/30">
                          ... et {cases.length - 10} autres dossiers
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-sm text-muted-foreground">
                        Aucun dossier pour cette banque
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}

      {/* Message si aucune banque sélectionnée */}
      {!selectedBankId && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Sélectionnez une banque</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Choisissez une banque dans le menu déroulant ci-dessus pour voir l'aperçu des données
                et générer un rapport PDF complet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
