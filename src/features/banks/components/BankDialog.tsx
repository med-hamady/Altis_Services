import { useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { useCreateBank, useUpdateBank } from '../hooks/useBanks'
import type { Bank } from '@/types'

interface BankDialogProps {
  bank: Bank | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type BankFormData = {
  name: string
  code: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

export function BankDialog({ bank, open, onOpenChange }: BankDialogProps) {
  const createBank = useCreateBank()
  const updateBank = useUpdateBank()

  const form = useForm<BankFormData>({
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      is_active: true,
    },
  })

  // Remplir le formulaire quand on édite
  useEffect(() => {
    if (bank) {
      form.reset({
        name: bank.name,
        code: bank.code,
        address: bank.address || '',
        city: bank.city || '',
        phone: bank.phone || '',
        email: bank.email || '',
        is_active: bank.is_active,
      })
    } else {
      form.reset({
        name: '',
        code: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        is_active: true,
      })
    }
  }, [bank, form])

  const onSubmit = async (data: BankFormData) => {
    try {
      if (bank) {
        // Mise à jour
        await updateBank.mutateAsync({ id: bank.id, bank: data })
      } else {
        // Création
        await createBank.mutateAsync(data)
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {bank ? 'Modifier la banque' : 'Nouvelle banque'}
          </DialogTitle>
          <DialogDescription>
            {bank
              ? 'Modifiez les informations de la banque'
              : 'Ajoutez une nouvelle banque partenaire'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Le nom est obligatoire' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la banque *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Banque Mauritanienne..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              rules={{
                required: 'Le code est obligatoire',
                pattern: {
                  value: /^[A-Z0-9]+$/,
                  message: 'Le code doit contenir uniquement des lettres majuscules et chiffres',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code banque *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: BMCI"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adresse complète de la banque"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Nouakchott"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                rules={{
                  pattern: {
                    value: /^\+?[0-9\s\-()]+$/,
                    message: 'Format de téléphone invalide',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+222 45 25 26 72"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        placeholder="contact@banque.mr"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Banque active</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      La banque peut créer de nouveaux dossiers
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                disabled={createBank.isPending || updateBank.isPending}
              >
                {createBank.isPending || updateBank.isPending
                  ? 'Enregistrement...'
                  : bank
                  ? 'Modifier'
                  : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
