import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { Plus, Trash2 } from 'lucide-react'
import { ProposalType, ProposalTypeLabels } from '@/types/enums'
import { useCreateProposal, useCounterProposal } from '../hooks/useCaseDetail'

interface ScheduleItem {
  due_date: string
  amount: string
  notes: string
}

interface ProposalFormData {
  type: ProposalType
  // one_time
  amount: string
  due_date: string
  // monthly
  monthly_amount: string
  start_date: string
  duration_months: string
  // schedule
  items: ScheduleItem[]
  // common
  notes: string
}

interface AddProposalDialogProps {
  caseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  remainingBalance?: number
  parentProposalId?: string
}

export function AddProposalDialog({
  caseId,
  open,
  onOpenChange,
  remainingBalance,
  parentProposalId,
}: AddProposalDialogProps) {
  const createProposal = useCreateProposal()
  const counterProposal = useCounterProposal()
  const [serverError, setServerError] = useState<string | null>(null)

  const isCounter = !!parentProposalId

  const form = useForm<ProposalFormData>({
    defaultValues: {
      type: ProposalType.Monthly,
      amount: '',
      due_date: '',
      monthly_amount: '',
      start_date: '',
      duration_months: '',
      items: [{ due_date: '', amount: '', notes: '' }],
      notes: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const selectedType = form.watch('type')
  const watchedMonthlyAmount = form.watch('monthly_amount')
  const watchedDuration = form.watch('duration_months')

  // Computed total for monthly type
  const monthlyTotal =
    selectedType === ProposalType.Monthly
      ? (parseFloat(watchedMonthlyAmount) || 0) * (parseInt(watchedDuration) || 0)
      : 0

  // Reset form on open
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10)
      form.reset({
        type: ProposalType.Monthly,
        amount: '',
        due_date: today,
        monthly_amount: '',
        start_date: today,
        duration_months: '',
        items: [{ due_date: today, amount: '', notes: '' }],
        notes: '',
      })
      setServerError(null)
    }
  }, [open, form])

  const formatMRU = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MRU',
      minimumFractionDigits: 0,
    }).format(amount)

  const onSubmit = async (data: ProposalFormData) => {
    setServerError(null)

    try {
      const base = {
        case_id: caseId,
        type: data.type,
        notes: data.notes || undefined,
      }

      let payload: Parameters<typeof createProposal.mutateAsync>[0]

      if (data.type === ProposalType.OneTime) {
        payload = {
          ...base,
          amount: parseFloat(data.amount),
          due_date: data.due_date,
        }
      } else if (data.type === ProposalType.Monthly) {
        payload = {
          ...base,
          monthly_amount: parseFloat(data.monthly_amount),
          start_date: data.start_date,
          duration_months: parseInt(data.duration_months),
        }
      } else {
        // schedule
        payload = {
          ...base,
          items: data.items.map((item) => ({
            due_date: item.due_date,
            amount: parseFloat(item.amount),
            notes: item.notes || undefined,
          })),
        }
      }

      if (isCounter && parentProposalId) {
        await counterProposal.mutateAsync({
          parent_proposal_id: parentProposalId,
          ...payload,
        })
        toast.success('Contre-proposition enregistree')
      } else {
        await createProposal.mutateAsync(payload)
        toast.success('Proposition enregistree')
      }
      onOpenChange(false)
    } catch (error: unknown) {
      console.error('Proposal creation error:', error)
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : JSON.stringify(error)
      setServerError(message)
      toast.error("Erreur lors de l'enregistrement de la proposition")
    }
  }

  const isPending = createProposal.isPending || counterProposal.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCounter ? 'Contre-proposition' : 'Nouvelle proposition'}
          </DialogTitle>
          <DialogDescription>
            {isCounter
              ? 'Proposer une alternative au debiteur'
              : 'Enregistrer une proposition de paiement du debiteur'}
            {remainingBalance != null && remainingBalance > 0 && (
              <span className="block mt-1 font-medium">
                Solde restant : {formatMRU(remainingBalance)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type de proposition */}
            <FormField
              control={form.control}
              name="type"
              rules={{ required: 'Type requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de proposition *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(ProposalType).map((t) => (
                        <SelectItem key={t} value={t}>
                          {ProposalTypeLabels[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* === PAIEMENT UNIQUE === */}
            {selectedType === ProposalType.OneTime && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  rules={{
                    required: 'Montant requis',
                    validate: (v) => {
                      const num = parseFloat(v)
                      if (isNaN(num) || num <= 0) return 'Montant invalide'
                      if (remainingBalance != null && num > remainingBalance) {
                        return `Ne peut pas depasser ${formatMRU(remainingBalance)}`
                      }
                      return true
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant (MRU) *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="due_date"
                  rules={{
                    required: "Date d'echeance requise",
                    validate: (v) => {
                      const d = new Date(v)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      if (d < today) return "La date doit etre dans le futur"
                      return true
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'echeance *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* === MENSUALITES === */}
            {selectedType === ProposalType.Monthly && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="monthly_amount"
                    rules={{
                      required: 'Montant mensuel requis',
                      validate: (v) => {
                        const num = parseFloat(v)
                        if (isNaN(num) || num <= 0) return 'Montant invalide'
                        return true
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant mensuel (MRU) *</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="start_date"
                    rules={{ required: 'Date de debut requise' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de debut *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration_months"
                    rules={{
                      required: 'Duree requise',
                      validate: (v) => {
                        const num = parseInt(v)
                        if (isNaN(num) || num < 1) return 'Minimum 1 mois'
                        if (num > 120) return 'Maximum 120 mois'
                        return true
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duree (mois) *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="120" placeholder="3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {monthlyTotal > 0 && (
                  <div className="rounded-md border bg-muted/50 p-3 text-sm">
                    <span className="font-medium">Total propose : </span>
                    {formatMRU(monthlyTotal)}
                    <span className="text-muted-foreground">
                      {' '}({watchedDuration} x {formatMRU(parseFloat(watchedMonthlyAmount) || 0)})
                    </span>
                    {remainingBalance != null && monthlyTotal > remainingBalance && (
                      <span className="block mt-1 text-destructive font-medium">
                        Attention : depasse le solde restant ({formatMRU(remainingBalance)})
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            {/* === ECHEANCIER PERSONNALISE === */}
            {selectedType === ProposalType.Schedule && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Echeances *</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10)
                      append({ due_date: today, amount: '', notes: '' })
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Ajouter
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.due_date`}
                      rules={{ required: 'Date requise' }}
                      render={({ field: f }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="date" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.amount`}
                      rules={{
                        required: 'Montant requis',
                        validate: (v) => {
                          const num = parseFloat(v)
                          if (isNaN(num) || num <= 0) return 'Montant invalide'
                          return true
                        },
                      }}
                      render={({ field: f }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="number" min="0" step="0.01" placeholder="Montant" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {fields.length > 0 && (
                  <div className="rounded-md border bg-muted/50 p-3 text-sm">
                    <span className="font-medium">Total : </span>
                    {formatMRU(
                      fields.reduce((sum, _, i) => {
                        const val = parseFloat(form.getValues(`items.${i}.amount`)) || 0
                        return sum + val
                      }, 0)
                    )}
                    <span className="text-muted-foreground">
                      {' '}({fields.length} echeance{fields.length > 1 ? 's' : ''})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Remarques sur la proposition..." rows={2} {...field} />
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
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
