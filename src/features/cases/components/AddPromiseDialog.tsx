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
import { useCreatePromise } from '../hooks/useCaseDetail'

const PAYMENT_METHODS = [
  { value: 'virement', label: 'Virement' },
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'autre', label: 'Autre' },
]

interface PromiseFormData {
  amount: string
  due_date: string
  payment_method: string
  reference: string
  notes: string
}

interface AddPromiseDialogProps {
  caseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Solde restant du dossier pour validation du montant */
  remainingBalance?: number
}

export function AddPromiseDialog({ caseId, open, onOpenChange, remainingBalance }: AddPromiseDialogProps) {
  const createPromise = useCreatePromise()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<PromiseFormData>({
    defaultValues: {
      amount: '',
      due_date: '',
      payment_method: '',
      reference: '',
      notes: '',
    },
  })

  // Rafraîchir le formulaire à chaque ouverture
  useEffect(() => {
    if (open) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      form.reset({
        amount: '',
        due_date: tomorrow.toISOString().slice(0, 10),
        payment_method: '',
        reference: '',
        notes: '',
      })
      setServerError(null)
    }
  }, [open, form])

  const onSubmit = async (data: PromiseFormData) => {
    setServerError(null)
    try {
      await createPromise.mutateAsync({
        case_id: caseId,
        amount: parseFloat(data.amount),
        due_date: data.due_date,
        payment_method: data.payment_method || undefined,
        reference: data.reference || undefined,
        notes: data.notes || undefined,
      })
      toast.success('Promesse de paiement enregistrée')
      onOpenChange(false)
      form.reset()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      setServerError(message)
      toast.error('Erreur lors de l\'enregistrement de la promesse')
    }
  }

  const formatMRU = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MRU', minimumFractionDigits: 0 }).format(amount)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle promesse de paiement</DialogTitle>
          <DialogDescription>
            Enregistrer une promesse de paiement du débiteur
            {remainingBalance != null && remainingBalance > 0 && (
              <span className="block mt-1 font-medium">
                Solde restant : {formatMRU(remainingBalance)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      return `Le montant ne peut pas dépasser le solde restant (${formatMRU(remainingBalance)})`
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
                  required: 'Date requise',
                  validate: (v) => {
                    const dueDate = new Date(v)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    if (dueDate < today) return 'La date d\'échéance doit être dans le futur'
                    return true
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'échéance *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de paiement</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Référence</FormLabel>
                  <FormControl>
                    <Input placeholder="Référence optionnelle..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaire</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Remarques sur la promesse..." rows={2} {...field} />
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
              <Button type="submit" disabled={createPromise.isPending}>
                {createPromise.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
