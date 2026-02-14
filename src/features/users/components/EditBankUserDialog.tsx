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
import { Eye, EyeOff } from 'lucide-react'
import { useUpdateBankUser } from '../hooks/useUsers'
import type { BankUser } from '@/types'

type EditBankUserFormData = {
  full_name: string
  phone: string
  job_title: string
  is_active: string
  pin: string
}

interface EditBankUserDialogProps {
  user: BankUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditBankUserDialog({ user, open, onOpenChange }: EditBankUserDialogProps) {
  const updateBankUser = useUpdateBankUser()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<EditBankUserFormData>({
    defaultValues: {
      full_name: '',
      phone: '',
      job_title: '',
      is_active: 'true',
      pin: '',
    },
  })

  useEffect(() => {
    if (open && user) {
      form.reset({
        full_name: user.full_name || '',
        phone: user.phone || '',
        job_title: user.job_title || '',
        is_active: user.is_active ? 'true' : 'false',
        pin: '',
      })
      setServerError(null)
    }
  }, [open, user, form])

  const onSubmit = async (data: EditBankUserFormData) => {
    if (!user) return
    setServerError(null)
    try {
      await updateBankUser.mutateAsync({
        id: user.id,
        user: {
          full_name: data.full_name,
          phone: data.phone || null,
          job_title: data.job_title || null,
          is_active: data.is_active === 'true',
        } as never,
        password: data.pin ? `altis${data.pin}` : undefined,
      })
      onOpenChange(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      setServerError(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur banque</DialogTitle>
          <DialogDescription>
            Modifier les informations de {user?.full_name}
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
              name="pin"
              rules={{
                validate: (v) => {
                  if (!v) return true
                  if (!/^\d{4}$/.test(v)) return 'Le code PIN doit contenir exactement 4 chiffres'
                  return true
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau code PIN</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="Laisser vide pour ne pas changer"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
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

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Actif</SelectItem>
                      <SelectItem value="false">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
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
                disabled={updateBankUser.isPending}
              >
                {updateBankUser.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
