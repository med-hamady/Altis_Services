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
import { ActionType, ActionTypeLabels, ActionResult, ActionResultLabels } from '@/types/enums'
import { useCreateAction } from '../hooks/useCaseDetail'

interface ActionFormData {
  action_type: ActionType
  action_date: string
  result: ActionResult
  notes: string
  next_action_type: string
  next_action_date: string
  next_action_notes: string
}

export interface ActionDialogResult {
  result: ActionResult
}

interface AddActionDialogProps {
  caseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Callback après création réussie, retourne le résultat pour les prompts chaînés */
  onCreated?: (data: ActionDialogResult) => void
  /** Pré-remplir le type d'action */
  defaultActionType?: ActionType
}

export function AddActionDialog({ caseId, open, onOpenChange, onCreated, defaultActionType }: AddActionDialogProps) {
  const createAction = useCreateAction()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ActionFormData>({
    defaultValues: {
      action_type: defaultActionType || ActionType.Call,
      action_date: new Date().toISOString().slice(0, 16),
      result: ActionResult.Reached,
      notes: '',
      next_action_type: '',
      next_action_date: '',
      next_action_notes: '',
    },
  })

  // Rafraîchir la date à chaque ouverture
  useEffect(() => {
    if (open) {
      form.reset({
        action_type: defaultActionType || ActionType.Call,
        action_date: new Date().toISOString().slice(0, 16),
        result: ActionResult.Reached,
        notes: '',
        next_action_type: '',
        next_action_date: '',
        next_action_notes: '',
      })
      setServerError(null)
    }
  }, [open, defaultActionType, form])

  // Résultat intelligent : auto-remplir prochaine action selon le résultat
  const watchResult = form.watch('result')
  const watchNextType = form.watch('next_action_type')

  useEffect(() => {
    if (watchResult === ActionResult.Unreachable) {
      // Injoignable => proposer rappel dans 2 jours
      const in2Days = new Date()
      in2Days.setDate(in2Days.getDate() + 2)
      form.setValue('next_action_type', ActionType.Call)
      form.setValue('next_action_date', in2Days.toISOString().slice(0, 16))
      form.setValue('next_action_notes', 'Tentative suivante')
    } else if (watchResult === ActionResult.Callback) {
      // À rappeler => proposer rappel dans 1 jour
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      form.setValue('next_action_type', ActionType.Call)
      form.setValue('next_action_date', tomorrow.toISOString().slice(0, 16))
      form.setValue('next_action_notes', 'Rappel demandé par le débiteur')
    }
  }, [watchResult, form])

  const onSubmit = async (data: ActionFormData) => {
    setServerError(null)
    try {
      await createAction.mutateAsync({
        case_id: caseId,
        action_type: data.action_type,
        action_date: data.action_date,
        result: data.result,
        notes: data.notes || undefined,
        next_action_type: data.next_action_type ? (data.next_action_type as ActionType) : undefined,
        next_action_date: data.next_action_date || undefined,
        next_action_notes: data.next_action_notes || undefined,
      })
      toast.success('Action enregistrée avec succès')
      onOpenChange(false)
      form.reset()
      // Notifier le parent du résultat pour les prompts chaînés
      onCreated?.({ result: data.result })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      setServerError(message)
      toast.error('Erreur lors de l\'enregistrement de l\'action')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Nouvelle action</DialogTitle>
          <DialogDescription>
            Enregistrer une action terrain sur ce dossier
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="action_type"
                rules={{ required: 'Type requis' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'action *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ActionTypeLabels).map(([value, label]) => (
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
                name="action_date"
                rules={{ required: 'Date requise' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date et heure *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="result"
              rules={{ required: 'Résultat requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Résultat *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ActionResultLabels).map(([value, label]) => (
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
              name="notes"
              rules={{
                required: 'Le compte-rendu est obligatoire',
                minLength: {
                  value: 10,
                  message: 'Le compte-rendu doit contenir au moins 10 caractères',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compte-rendu *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Détails de l'action (minimum 10 caractères)..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prochaine action */}
            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium text-muted-foreground">Prochaine action (optionnel)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="next_action_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Aucun" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(ActionTypeLabels).map(([value, label]) => (
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
                  name="next_action_date"
                  rules={{
                    validate: (value) => {
                      if (watchNextType && !value) {
                        return 'Date prévue obligatoire si prochaine action choisie'
                      }
                      if (value && form.getValues('action_date')) {
                        const actionDate = new Date(form.getValues('action_date'))
                        const nextDate = new Date(value)
                        if (nextDate < actionDate) {
                          return 'La date prévue doit être après la date de l\'action'
                        }
                      }
                      return true
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date prévue {watchNextType ? '*' : ''}</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="next_action_notes"
                render={({ field }) => (
                  <FormItem className="mt-3">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Notes pour la prochaine action..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {serverError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createAction.isPending}>
                {createAction.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
