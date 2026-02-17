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
import { Separator } from '@/components/ui/separator'
import { useCreateCase } from '../hooks/useCases'
import { useBanks } from '@/features/banks/hooks/useBanks'
import { useDebtorsPPByBank, useDebtorsPMByBank } from '@/features/debtors/hooks/useDebtors'
import { CasePhase, CasePhaseLabels } from '@/types/enums'
import type { CreateCaseDTO } from '@/types'

interface CreateCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bankId?: string
}

type DebtorType = 'pp' | 'pm'

type CaseFormData = {
  // Identification
  bank_id: string
  debtor_id: string
  // Classification
  phase: CasePhase
  // Informations créance
  default_date: string
  // Montants (MRU)
  amount_principal: string
  amount_interest: string
  amount_penalties: string
  amount_fees: string
  // Notes
  notes: string
}

export function CreateCaseDialog({ open, onOpenChange, bankId }: CreateCaseDialogProps) {
  const createCase = useCreateCase()
  const { data: banks } = useBanks()

  const [debtorType, setDebtorType] = useState<DebtorType>('pp')

  const defaultValues: CaseFormData = {
    bank_id: bankId || '',
    debtor_id: '',
    phase: CasePhase.Amicable,
    default_date: '',
    amount_principal: '',
    amount_interest: '0',
    amount_penalties: '0',
    amount_fees: '0',
    notes: '',
  }

  const form = useForm<CaseFormData>({ defaultValues })

  const selectedBankId = bankId || form.watch('bank_id')

  const { data: debtorsPP } = useDebtorsPPByBank(selectedBankId || '')
  const { data: debtorsPM } = useDebtorsPMByBank(selectedBankId || '')

  useEffect(() => {
    if (open) {
      form.reset({ ...defaultValues, bank_id: bankId || '' })
      setDebtorType('pp')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bankId])

  useEffect(() => {
    form.setValue('debtor_id', '')
  }, [debtorType, selectedBankId, form])

  const onSubmit = async (data: CaseFormData) => {
    if (!data.debtor_id) {
      toast.error('Veuillez sélectionner un débiteur')
      return
    }

    try {
      const caseData: CreateCaseDTO = {
        bank_id: bankId || data.bank_id,
        debtor_pp_id: debtorType === 'pp' ? data.debtor_id : undefined,
        debtor_pm_id: debtorType === 'pm' ? data.debtor_id : undefined,
        phase: data.phase,
        default_date: data.default_date || undefined,
        amount_principal: parseFloat(data.amount_principal) || 0,
        amount_interest: parseFloat(data.amount_interest) || 0,
        amount_penalties: parseFloat(data.amount_penalties) || 0,
        amount_fees: parseFloat(data.amount_fees) || 0,
        notes: data.notes || undefined,
      }

      await createCase.mutateAsync(caseData)
      onOpenChange(false)
      toast.success('Dossier créé avec succès')
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error)
      toast.error('Erreur lors de la création du dossier')
    }
  }

  const debtors = debtorType === 'pp' ? debtorsPP : debtorsPM

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau dossier de recouvrement</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un dossier de recouvrement
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ─── 1. IDENTIFICATION ─── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Identification
              </h3>

              {/* Banque */}
              {!bankId && (
                <FormField
                  control={form.control}
                  name="bank_id"
                  rules={{ required: 'La banque est obligatoire' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banque *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une banque" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {banks?.filter(b => b.is_active).map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              {bank.name} ({bank.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Type de débiteur */}
              <div>
                <label className="text-sm font-medium leading-none">Type de débiteur *</label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={debtorType === 'pp' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDebtorType('pp')}
                  >
                    Personne Physique
                  </Button>
                  <Button
                    type="button"
                    variant={debtorType === 'pm' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDebtorType('pm')}
                  >
                    Personne Morale
                  </Button>
                </div>
              </div>

              {/* Sélection du débiteur */}
              <FormField
                control={form.control}
                name="debtor_id"
                rules={{ required: 'Le débiteur est obligatoire' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Débiteur ({debtorType === 'pp' ? 'Personne Physique' : 'Personne Morale'}) *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un débiteur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {debtors && debtors.length > 0 ? (
                          debtorType === 'pp'
                            ? debtorsPP?.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.last_name} {d.first_name} {d.id_number ? `— ${d.id_number}` : ''}
                                </SelectItem>
                              ))
                            : debtorsPM?.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.company_name} {d.rc_number ? `— RC: ${d.rc_number}` : ''}
                                </SelectItem>
                              ))
                        ) : (
                          <SelectItem value="__none" disabled>
                            Aucun débiteur trouvé
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <Separator />

            {/* ─── 2. INFORMATIONS SUR LA CRÉANCE ─── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Informations sur la créance
              </h3>

              <FormField
                control={form.control}
                name="default_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de défaut de paiement</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* ─── 3. MONTANTS DE LA CRÉANCE (MRU) ─── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Montants de la créance (MRU)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount_principal"
                  rules={{ required: 'Le montant principal est obligatoire' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capital principal *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
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
                      <FormLabel>Intérêts / Agios</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount_penalties"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pénalités de retard</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount_fees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frais de recouvrement</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* ─── 4. CLASSIFICATION ─── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Classification
              </h3>

              <FormField
                control={form.control}
                name="phase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phase de recouvrement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(CasePhase).map((p) => (
                          <SelectItem key={p} value={p}>
                            {CasePhaseLabels[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* ─── 5. NOTES ─── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Notes
              </h3>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes générales</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informations complémentaires sur le dossier..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createCase.isPending}
              >
                {createCase.isPending ? 'Création en cours...' : 'Créer le dossier'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
