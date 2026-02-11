import { useEffect, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateBankUser } from '../hooks/useUsers'
import { useBanks } from '@/features/banks/hooks/useBanks'

type BankUserFormData = {
  email: string
  password: string
  full_name: string
  phone: string
  bank_id: string
  job_title: string
}

interface BankUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BankUserDialog({ open, onOpenChange }: BankUserDialogProps) {
  const createBankUser = useCreateBankUser()
  const { data: banks } = useBanks()
  const [serverError, setServerError] = useState<string | null>(null)

  const activeBanks = banks?.filter((b) => b.is_active) || []

  const form = useForm<BankUserFormData>({
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      phone: '',
      bank_id: '',
      job_title: '',
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
      setServerError(null)
    }
  }, [open, form])

  const onSubmit = async (data: BankUserFormData) => {
    setServerError(null)
    try {
      await createBankUser.mutateAsync({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone || undefined,
        bank_id: data.bank_id,
        job_title: data.job_title || undefined,
      })
      onOpenChange(false)
      form.reset()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      if (message.includes('invalid') || message.includes('email')) {
        setServerError("Adresse email invalide ou rejetée. Essayez un email avec un domaine standard (ex: gmail.com).")
      } else if (message.includes('rate limit') || message.includes('429')) {
        setServerError("Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.")
      } else if (message.includes('already registered') || message.includes('duplicate')) {
        setServerError("Un utilisateur avec cet email existe déjà.")
      } else {
        setServerError(message)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur banque</DialogTitle>
          <DialogDescription>
            Créez un compte pour un utilisateur d'une banque partenaire
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              rules={{ required: 'Le nom complet est obligatoire' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Fatima Mint Ahmed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              rules={{
                required: "L'email est obligatoire",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Email invalide',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="utilisateur@banque.mr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              rules={{
                required: 'Le mot de passe est obligatoire',
                minLength: {
                  value: 6,
                  message: 'Le mot de passe doit contenir au moins 6 caractères',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe *</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Minimum 6 caractères" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        <SelectValue placeholder="Sélectionnez une banque" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeBanks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <Input placeholder="+222 33 12 34 56" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poste / Fonction</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Responsable contentieux" {...field} />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createBankUser.isPending}
              >
                {createBankUser.isPending ? 'Création...' : 'Créer l\'utilisateur'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
