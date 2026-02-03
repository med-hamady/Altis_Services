import { useForm } from 'react-hook-form'
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
import { toast } from 'sonner'
import { useCreateDebtorPM, type CreateDebtorPMInput } from '../hooks/useDebtors'
import type { DebtorPM } from '@/types'

interface AddDebtorPMDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (debtor: DebtorPM) => void
}

export function AddDebtorPMDialog({ open, onOpenChange, onCreated }: AddDebtorPMDialogProps) {
  const createDebtorPM = useCreateDebtorPM()

  const form = useForm<CreateDebtorPMInput>({
    defaultValues: {
      company_name: '',
      trade_name: null,
      rc_number: null,
      nif: null,
      legal_rep_name: null,
      legal_rep_title: null,
      legal_rep_phone: null,
      phone_primary: null,
      phone_secondary: null,
      email: null,
      website: null,
      address_street: null,
      address_city: null,
      address_region: null,
      sector_activity: null,
      alt_contact_name: null,
      alt_contact_relation: null,
      alt_contact_phone: null,
      notes: null,
      created_by: null,
    },
  })

  const onSubmit = async (data: CreateDebtorPMInput) => {
    try {
      const result = await createDebtorPM.mutateAsync(data)
      toast.success('Personne morale créée avec succès')
      onCreated?.(result)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de la personne morale')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau débiteur - Personne Morale</DialogTitle>
          <DialogDescription>
            Ajoutez une nouvelle entreprise en tant que débiteur
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Informations de l'entreprise */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">
              Informations de l&apos;entreprise
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                rules={{ required: 'La raison sociale est obligatoire' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raison sociale *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'entreprise" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trade_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom commercial</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom commercial"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rc_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro RC</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Registre du commerce"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Numéro d'identification fiscale"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Représentant légal */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">
              Représentant légal
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="legal_rep_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du représentant</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom complet"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legal_rep_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fonction</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Gérant, PDG..."
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="legal_rep_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone du représentant</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+222 XX XX XX XX"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coordonnées */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">
              Coordonnées
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone_primary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone principal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+222 XX XX XX XX"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_secondary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone secondaire</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+222 XX XX XX XX"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                rules={{
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email invalide',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@entreprise.mr"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site web</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="www.entreprise.mr"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Adresse */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">
              Adresse
            </h4>

            <FormField
              control={form.control}
              name="address_street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rue / Adresse</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Adresse complète"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Nouakchott"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address_region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Région</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Nouakchott-Ouest"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Activité */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">
              Activité
            </h4>

            <FormField
              control={form.control}
              name="sector_activity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secteur d&apos;activité</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: BTP, Commerce, Services..."
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact alternatif */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">
              Contact alternatif
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="alt_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du contact</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom complet"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alt_contact_relation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relation</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Associé, Comptable..."
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="alt_contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone du contact</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+222 XX XX XX XX"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">
              Notes
            </h4>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informations complémentaires..."
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={createDebtorPM.isPending}
              >
                {createDebtorPM.isPending ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
