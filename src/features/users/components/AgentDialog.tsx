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
import { useCreateAgent } from '../hooks/useUsers'

type AgentFormData = {
  email: string
  password: string
  full_name: string
  phone: string
  sector: string
  zone: string
}

interface AgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentDialog({ open, onOpenChange }: AgentDialogProps) {
  const createAgent = useCreateAgent()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<AgentFormData>({
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      phone: '',
      sector: '',
      zone: '',
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
      setServerError(null)
    }
  }, [open, form])

  const onSubmit = async (data: AgentFormData) => {
    setServerError(null)
    try {
      await createAgent.mutateAsync({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone || undefined,
        sector: data.sector || undefined,
        zone: data.zone || undefined,
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
          <DialogTitle>Nouvel agent terrain</DialogTitle>
          <DialogDescription>
            Créez un compte pour un nouvel agent de recouvrement
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
                    <Input placeholder="Ex: Mohamed Ould Sidi" {...field} />
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
                    <Input type="email" placeholder="agent@altis-services.mr" {...field} />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secteur</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Bancaire" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Nouakchott" {...field} />
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
                disabled={createAgent.isPending}
              >
                {createAgent.isPending ? 'Création...' : 'Créer l\'agent'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
