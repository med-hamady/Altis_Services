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
import { BankAvatar } from '@/components/BankAvatar'

type BankUserFormData = {
  username: string
  pin: string
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
      username: '',
      pin: '',
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
      const email = `${data.username.toLowerCase().trim()}@altis.local`
      const password = `altis${data.pin}`

      await createBankUser.mutateAsync({
        email,
        password,
        full_name: data.full_name,
        phone: data.phone || undefined,
        bank_id: data.bank_id,
        job_title: data.job_title || undefined,
        username: data.username.toLowerCase().trim(),
      })
      onOpenChange(false)
      form.reset()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      if (message.includes('rate limit') || message.includes('429')) {
        setServerError("Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.")
      } else if (message.includes('already registered') || message.includes('duplicate')) {
        setServerError("Ce nom d'utilisateur est déjà pris.")
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                rules={{
                  required: "Le nom d'utilisateur est obligatoire",
                  pattern: {
                    value: /^[a-zA-Z0-9._-]+$/,
                    message: 'Lettres, chiffres, points et tirets uniquement',
                  },
                  minLength: {
                    value: 3,
                    message: 'Minimum 3 caractères',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom d'utilisateur *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: fatima.sgm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pin"
                rules={{
                  required: 'Le code PIN est obligatoire',
                  pattern: {
                    value: /^\d{4}$/,
                    message: 'Le code PIN doit contenir exactement 4 chiffres',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code PIN *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="4 chiffres"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                          <div className="flex items-center gap-2">
                            <BankAvatar logoUrl={bank.logo_url} name={bank.name} size="sm" />
                            {bank.name}
                          </div>
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
