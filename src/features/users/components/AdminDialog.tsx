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
import { useCreateAdmin } from '../hooks/useUsers'

type AdminFormData = {
  username: string
  pin: string
  full_name: string
  phone: string
}

interface AdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminDialog({ open, onOpenChange }: AdminDialogProps) {
  const createAdmin = useCreateAdmin()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<AdminFormData>({
    defaultValues: {
      username: '',
      pin: '',
      full_name: '',
      phone: '',
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
      setServerError(null)
    }
  }, [open, form])

  const onSubmit = async (data: AdminFormData) => {
    setServerError(null)
    try {
      const email = `${data.username.toLowerCase().trim()}@altis.local`
      const password = `altis${data.pin}`

      await createAdmin.mutateAsync({
        email,
        password,
        full_name: data.full_name,
        phone: data.phone || undefined,
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
          <DialogTitle>Nouvel administrateur</DialogTitle>
          <DialogDescription>
            Créez un compte pour un nouvel administrateur
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
                    <Input placeholder="Ex: Ahmed Salem" {...field} />
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
                      <Input placeholder="Ex: ahmed.admin" {...field} />
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
                disabled={createAdmin.isPending}
              >
                {createAdmin.isPending ? 'Création...' : 'Créer l\'admin'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
