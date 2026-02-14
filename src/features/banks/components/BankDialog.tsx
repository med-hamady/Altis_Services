import { useEffect, useRef, useState } from 'react'
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
import { Building2, Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
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
  logo_url: string | null
  is_active: boolean
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024 // 2 Mo

export function BankDialog({ bank, open, onOpenChange }: BankDialogProps) {
  const createBank = useCreateBank()
  const updateBank = useUpdateBank()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const form = useForm<BankFormData>({
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      phone: '',
      email: '',
      logo_url: null,
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
        logo_url: bank.logo_url,
        is_active: bank.is_active,
      })
      setLogoPreview(bank.logo_url || null)
    } else {
      form.reset({
        name: '',
        code: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        logo_url: null,
        is_active: true,
      })
      setLogoPreview(null)
    }
    setLogoFile(null)
    setFileError(null)
  }, [bank, form])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Format accepté : JPG, PNG ou WebP')
      return
    }

    if (file.size > MAX_SIZE) {
      setFileError("L'image ne doit pas dépasser 2 Mo")
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(bank?.logo_url || null)
    setFileError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadLogo = async (bankId: string): Promise<string | null> => {
    if (!logoFile) return null

    const ext = logoFile.name.split('.').pop()
    const filePath = `banks/${bankId}/logo.${ext}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, logoFile, { upsert: true })

    if (error) throw error

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  const onSubmit = async (data: BankFormData) => {
    try {
      setUploading(true)

      if (bank) {
        // Mise à jour
        let logoUrl = data.logo_url
        if (logoFile) {
          logoUrl = await uploadLogo(bank.id)
        }
        await updateBank.mutateAsync({ id: bank.id, bank: { ...data, logo_url: logoUrl } })
      } else {
        // Création : d'abord créer la banque, puis uploader le logo
        const newBank = await createBank.mutateAsync(data)
        if (logoFile && newBank?.id) {
          const logoUrl = await uploadLogo(newBank.id)
          if (logoUrl) {
            await updateBank.mutateAsync({ id: newBank.id, bank: { logo_url: logoUrl } })
          }
        }
      }
      onOpenChange(false)
      form.reset()
      setLogoFile(null)
      setLogoPreview(null)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setUploading(false)
    }
  }

  const isPending = createBank.isPending || updateBank.isPending || uploading

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
            {/* Upload logo */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/50 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-3 w-3" />
                  {logoPreview ? 'Changer le logo' : 'Ajouter un logo'}
                </Button>
                {logoFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeLogo}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Retirer
                  </Button>
                )}
              </div>
              {fileError && (
                <p className="text-sm text-destructive">{fileError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

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
                disabled={isPending}
              >
                {isPending
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
