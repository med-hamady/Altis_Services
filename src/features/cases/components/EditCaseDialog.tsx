import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateCase } from '../hooks/useCaseDetail'
import type { Case } from '@/types'
import { CasePhase, CasePhaseLabels } from '@/types/enums'

interface EditCaseFormData {
  phase: string
  default_date: string
  product_type: string
  contract_reference: string
  risk_level: string
  amount_principal: string
  amount_interest: string
  amount_penalties: string
  amount_fees: string
  guarantee_description: string
  notes: string
  internal_notes: string
}

interface EditCaseDialogProps {
  caseData: Case
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCaseDialog({ caseData, open, onOpenChange }: EditCaseDialogProps) {
  const updateCase = useUpdateCase()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<EditCaseFormData>({
    defaultValues: {
      phase: '',
      default_date: '',
      product_type: '',
      contract_reference: '',
      risk_level: '',
      amount_principal: '',
      amount_interest: '',
      amount_penalties: '',
      amount_fees: '',
      guarantee_description: '',
      notes: '',
      internal_notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        phase: caseData.phase || '',
        default_date: caseData.default_date?.slice(0, 10) || '',
        product_type: caseData.product_type || '',
        contract_reference: caseData.contract_reference || '',
        risk_level: caseData.risk_level || '',
        amount_principal: String(caseData.amount_principal || 0),
        amount_interest: String(caseData.amount_interest || 0),
        amount_penalties: String(caseData.amount_penalties || 0),
        amount_fees: String(caseData.amount_fees || 0),
        guarantee_description: caseData.guarantee_description || '',
        notes: caseData.notes || '',
        internal_notes: caseData.internal_notes || '',
      })
      setServerError(null)
    }
  }, [open, form, caseData])

  const onSubmit = async (data: EditCaseFormData) => {
    setServerError(null)
    try {
      await updateCase.mutateAsync({
        id: caseData.id,
        phase: data.phase as CasePhase,
        default_date: data.default_date || null,
        product_type: data.product_type || null,
        contract_reference: data.contract_reference || null,
        risk_level: data.risk_level || null,
        amount_principal: parseFloat(data.amount_principal) || 0,
        amount_interest: parseFloat(data.amount_interest) || 0,
        amount_penalties: parseFloat(data.amount_penalties) || 0,
        amount_fees: parseFloat(data.amount_fees) || 0,
        guarantee_description: data.guarantee_description || null,
        notes: data.notes || null,
        internal_notes: data.internal_notes || null,
      })
      toast.success('Dossier mis à jour')
      onOpenChange(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      setServerError(message)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le dossier</DialogTitle>
          <DialogDescription>
            {caseData.reference} — Modifier les informations complémentaires
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Traitement + Date impayé */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phase"
                rules={{ required: 'Traitement requis' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Traitement *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CasePhaseLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'entrée en impayé</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Produit + Contrat + Risque */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="product_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produit</FormLabel>
                    <FormControl>
                      <Input placeholder="Type de produit..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contract_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Réf. contrat</FormLabel>
                    <FormControl>
                      <Input placeholder="N° de contrat..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="risk_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveau de risque</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Faible</SelectItem>
                        <SelectItem value="medium">Moyen</SelectItem>
                        <SelectItem value="high">Élevé</SelectItem>
                        <SelectItem value="critical">Critique</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Montants */}
            <div>
              <p className="text-sm font-medium mb-2">Montants de la dette</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FormField
                  control={form.control}
                  name="amount_principal"
                  rules={{ validate: (v) => !isNaN(parseFloat(v)) || 'Montant invalide' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Principal</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount_interest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Intérêts</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount_penalties"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Pénalités</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount_fees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Frais</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Garantie */}
            <FormField
              control={form.control}
              name="guarantee_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Garantie</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description de la garantie..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes sur le dossier..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes internes admin */}
            <FormField
              control={form.control}
              name="internal_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes internes (admin uniquement)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes internes, visibles uniquement par les admins..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updateCase.isPending}>
                {updateCase.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
