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
import { useUpdateAdmin } from '../hooks/useUsers'
import type { Admin } from '@/types'

type EditAdminFormData = {
  full_name: string
  phone: string
  is_active: string
  password: string
}

interface EditAdminDialogProps {
  admin: Admin | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditAdminDialog({ admin, open, onOpenChange }: EditAdminDialogProps) {
  const updateAdmin = useUpdateAdmin()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<EditAdminFormData>({
    defaultValues: {
      full_name: '',
      phone: '',
      is_active: 'true',
      password: '',
    },
  })

  useEffect(() => {
    if (open && admin) {
      form.reset({
        full_name: admin.full_name || '',
        phone: admin.phone || '',
        is_active: admin.is_active ? 'true' : 'false',
        password: '',
      })
      setServerError(null)
    }
  }, [open, admin, form])

  const onSubmit = async (data: EditAdminFormData) => {
    if (!admin) return
    setServerError(null)
    try {
      await updateAdmin.mutateAsync({
        id: admin.id,
        admin: {
          full_name: data.full_name,
          phone: data.phone || null,
          is_active: data.is_active === 'true',
        } as never,
        password: data.password || undefined,
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
          <DialogTitle>Modifier l'administrateur</DialogTitle>
          <DialogDescription>
            Modifier les informations de {admin?.full_name}
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
              name="password"
              rules={{
                minLength: {
                  value: 6,
                  message: 'Le mot de passe doit contenir au moins 6 caractères',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
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
                disabled={updateAdmin.isPending}
              >
                {updateAdmin.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
