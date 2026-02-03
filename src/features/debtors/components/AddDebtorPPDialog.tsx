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
import { useCreateDebtorPP } from '../hooks/useDebtors'
import type { DebtorPP } from '@/types'
import { toast } from 'sonner'

interface AddDebtorPPDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (debtor: DebtorPP) => void
}

type DebtorPPFormData = {
  first_name: string
  last_name: string
  date_of_birth: string
  id_type: string
  id_number: string
  phone_primary: string
  phone_secondary: string
  email: string
  address_street: string
  address_city: string
  address_region: string
  employer: string
  occupation: string
  alt_contact_name: string
  alt_contact_relation: string
  alt_contact_phone: string
  notes: string
}

const defaultValues: DebtorPPFormData = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  id_type: '',
  id_number: '',
  phone_primary: '',
  phone_secondary: '',
  email: '',
  address_street: '',
  address_city: '',
  address_region: '',
  employer: '',
  occupation: '',
  alt_contact_name: '',
  alt_contact_relation: '',
  alt_contact_phone: '',
  notes: '',
}

export function AddDebtorPPDialog({ open, onOpenChange, onCreated }: AddDebtorPPDialogProps) {
  const createDebtorPP = useCreateDebtorPP()

  const form = useForm<DebtorPPFormData>({
    defaultValues,
  })

  const onSubmit = async (data: DebtorPPFormData) => {
    try {
      const result = await createDebtorPP.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth || null,
        id_type: data.id_type || null,
        id_number: data.id_number || null,
        phone_primary: data.phone_primary || null,
        phone_secondary: data.phone_secondary || null,
        email: data.email || null,
        address_street: data.address_street || null,
        address_city: data.address_city || null,
        address_region: data.address_region || null,
        address_work_street: null,
        address_work_city: null,
        address_work_region: null,
        employer: data.employer || null,
        occupation: data.occupation || null,
        alt_contact_name: data.alt_contact_name || null,
        alt_contact_relation: data.alt_contact_relation || null,
        alt_contact_phone: data.alt_contact_phone || null,
        notes: data.notes || null,
        created_by: null,
      })
      toast.success('Débiteur créé avec succès')
      onCreated?.(result)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création du débiteur')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau débiteur - Personne Physique</DialogTitle>
          <DialogDescription>
            Ajoutez un nouveau débiteur personne physique
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Identité */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">Identité</h4>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                rules={{ required: 'Le prénom est obligatoire' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Prénom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                rules={{ required: 'Le nom est obligatoire' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de famille" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de naissance</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="id_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de pièce d'identité</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CNI, Passeport..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de pièce</FormLabel>
                    <FormControl>
                      <Input placeholder="Numéro d'identification" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Coordonnées */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">Coordonnées</h4>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone_primary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone principal</FormLabel>
                    <FormControl>
                      <Input placeholder="+222 XX XX XX XX" {...field} />
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
                      <Input placeholder="+222 XX XX XX XX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    <Input type="email" placeholder="email@exemple.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Adresse */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">Adresse</h4>

            <FormField
              control={form.control}
              name="address_street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rue / Quartier</FormLabel>
                  <FormControl>
                    <Input placeholder="Adresse complète" {...field} />
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
                      <Input placeholder="Ex: Nouakchott" {...field} />
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
                      <Input placeholder="Ex: Nouakchott-Ouest" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Emploi */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">Emploi</h4>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employeur</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'employeur" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profession</FormLabel>
                    <FormControl>
                      <Input placeholder="Profession exercée" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact alternatif */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">Contact alternatif</h4>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="alt_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom complet" {...field} />
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
                      <Input placeholder="Ex: Frère, Ami..." {...field} />
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
                    <Input placeholder="+222 XX XX XX XX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <h4 className="text-sm font-semibold text-muted-foreground pt-2">Informations complémentaires</h4>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes ou observations..."
                      {...field}
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
                disabled={createDebtorPP.isPending}
              >
                {createDebtorPP.isPending ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
