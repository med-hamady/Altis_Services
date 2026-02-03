import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useBanks } from '@/features/banks/hooks/useBanks'
import { useImports, useCreateImport, useProcessImport } from '../hooks/useImports'
import { ImportStatus, ImportStatusLabels } from '@/types/enums'
import { toast } from 'sonner'

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  uploaded: 'outline',
  processing: 'secondary',
  ready_for_review: 'default',
  approved: 'default',
  rejected: 'destructive',
  failed: 'destructive',
}

export function ImportsPage() {
  const { currentUser } = useAuth()
  const { data: banks, isLoading: banksLoading } = useBanks()
  const { data: imports, isLoading: importsLoading } = useImports()
  const createImport = useCreateImport()
  const processImport = useProcessImport()
  const navigate = useNavigate()

  const [selectedBankId, setSelectedBankId] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadAndAnalyze = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toast.error('Veuillez sélectionner un fichier Excel')
      return
    }
    if (!selectedBankId) {
      toast.error('Veuillez sélectionner une banque')
      return
    }
    if (!currentUser?.id) return

    setIsUploading(true)
    try {
      // 1. Upload
      const importRecord = await createImport.mutateAsync({
        bankId: selectedBankId,
        file,
        userId: currentUser.id,
      })

      toast.success('Fichier uploadé. Lancement de l\'analyse...')

      // 2. Process
      await processImport.mutateAsync(importRecord.id)

      toast.success('Analyse terminée !')
      navigate(`/imports/${importRecord.id}`)
    } catch (err) {
      toast.error(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Excel</h1>
        <p className="text-muted-foreground">
          Importez des dossiers en masse à partir d'un fichier Excel
        </p>
      </div>

      {/* Formulaire d'upload */}
      <Card>
        <CardHeader>
          <CardTitle>Nouveau import</CardTitle>
          <CardDescription>
            Sélectionnez une banque et uploadez un fichier Excel (feuille &quot;DOSSIERS&quot;)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="bank-select">Banque *</Label>
              <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                <SelectTrigger id="bank-select">
                  <SelectValue placeholder="Sélectionner une banque" />
                </SelectTrigger>
                <SelectContent>
                  {banks?.filter((b) => b.is_active).map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="file-input">Fichier Excel *</Label>
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                disabled={!selectedBankId}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button
              onClick={handleUploadAndAnalyze}
              disabled={isUploading || !selectedBankId}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Analyser
                </>
              )}
            </Button>
          </div>
          {selectedBankId && (
            <p className="mt-3 text-xs text-muted-foreground">
              Toutes les lignes importées seront rattachées à la banque sélectionnée.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Historique des imports */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des imports</CardTitle>
          <CardDescription>
            {imports?.length || 0} import(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {importsLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : imports && imports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Banque</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Lignes</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="text-sm">
                      {formatDate(imp.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[150px] truncate">
                        {imp.bank?.name || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        <span className="max-w-[150px] truncate text-sm">
                          {imp.file_name || 'fichier.xlsx'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        {imp.total_rows > 0 && (
                          <>
                            <span className="font-medium">{imp.total_rows}</span>
                            {imp.valid_rows > 0 && (
                              <span className="flex items-center gap-0.5 text-green-600">
                                <CheckCircle className="h-3 w-3" />{imp.valid_rows}
                              </span>
                            )}
                            {imp.warning_rows > 0 && (
                              <span className="flex items-center gap-0.5 text-yellow-600">
                                <AlertTriangle className="h-3 w-3" />{imp.warning_rows}
                              </span>
                            )}
                            {imp.error_rows > 0 && (
                              <span className="flex items-center gap-0.5 text-red-600">
                                <XCircle className="h-3 w-3" />{imp.error_rows}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[imp.status] || 'outline'}>
                        {ImportStatusLabels[imp.status as ImportStatus] || imp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(imp.status === 'ready_for_review' || imp.status === 'approved' || imp.status === 'failed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/imports/${imp.id}`)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Voir
                        </Button>
                      )}
                      {imp.status === 'processing' && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          En cours...
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Aucun import</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Commencez par uploader un fichier Excel ci-dessus
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
