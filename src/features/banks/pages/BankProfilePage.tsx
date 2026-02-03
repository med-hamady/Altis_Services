import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Camera, Landmark, Save, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAuth } from '@/contexts/AuthContext'
import { useBank, useUpdateBankProfile, useUpdateBankUserProfile } from '../hooks/useBanks'
import { supabase } from '@/lib/supabase/client'
import type { BankUser } from '@/types'

type BankProfileFormData = {
  name: string
  address: string
  city: string
  phone: string
  email: string
}

type UserProfileFormData = {
  full_name: string
  phone: string
  job_title: string
}

export function BankProfilePage() {
  const { currentUser } = useAuth()
  const bankUser = currentUser as BankUser & { userType: 'bank_user' }
  const { data: bank } = useBank(bankUser.bank_id)
  const updateBankProfile = useUpdateBankProfile()
  const updateUserProfile = useUpdateBankUserProfile()

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const bankForm = useForm<BankProfileFormData>({
    values: {
      name: bank?.name || '',
      address: bank?.address || '',
      city: bank?.city || '',
      phone: bank?.phone || '',
      email: bank?.email || '',
    },
  })

  const userForm = useForm<UserProfileFormData>({
    values: {
      full_name: bankUser.full_name || '',
      phone: bankUser.phone || '',
      job_title: bankUser.job_title || '',
    },
  })

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo')
      return null
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format accepté : JPG, PNG ou WebP')
      return null
    }

    const ext = file.name.split('.').pop()
    const filePath = `${path}.${ext}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (error) {
      toast.error('Erreur lors de l\'upload')
      return null
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !bank) return

    setUploadingLogo(true)
    try {
      const url = await uploadImage(file, `banks/${bank.id}/logo`)
      if (url) {
        await updateBankProfile.mutateAsync({ id: bank.id, data: { logo_url: url } })
        toast.success('Logo mis à jour')
      }
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const url = await uploadImage(file, `users/${bankUser.id}/avatar`)
      if (url) {
        await updateUserProfile.mutateAsync({ id: bankUser.id, data: { avatar_url: url } })
        toast.success('Photo de profil mise à jour')
      }
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const onBankSubmit = async (data: BankProfileFormData) => {
    if (!bank) return
    try {
      await updateBankProfile.mutateAsync({
        id: bank.id,
        data: {
          name: data.name,
          address: data.address || null,
          city: data.city || null,
          phone: data.phone || null,
          email: data.email || null,
        },
      })
      toast.success('Profil de la banque mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const onUserSubmit = async (data: UserProfileFormData) => {
    try {
      await updateUserProfile.mutateAsync({
        id: bankUser.id,
        data: {
          full_name: data.full_name,
          phone: data.phone || null,
          job_title: data.job_title || null,
        },
      })
      toast.success('Profil personnel mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground">
          Gérez les informations de votre banque et votre profil personnel
        </p>
      </div>

      {/* Profil Banque */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div
              className="relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed bg-muted transition-colors hover:border-primary"
              onClick={() => logoInputRef.current?.click()}
            >
              {bank?.logo_url ? (
                <img
                  src={bank.logo_url}
                  alt="Logo"
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <Landmark className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Camera className="h-3 w-3" />
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
            </div>
            <div>
              <CardTitle>Profil de la banque</CardTitle>
              <CardDescription>
                {bank?.code} — Cliquez sur l'image pour changer le logo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...bankForm}>
            <form onSubmit={bankForm.handleSubmit(onBankSubmit)} className="space-y-4">
              <FormField
                control={bankForm.control}
                name="name"
                rules={{ required: 'Le nom est obligatoire' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la banque *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bankForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bankForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bankForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={bankForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateBankProfile.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateBankProfile.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Profil Personnel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div
              className="relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-2 border-dashed bg-muted transition-colors hover:border-primary"
              onClick={() => avatarInputRef.current?.click()}
            >
              {bankUser.avatar_url ? (
                <img
                  src={bankUser.avatar_url}
                  alt="Avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Camera className="h-3 w-3" />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </div>
            <div>
              <CardTitle>Profil personnel</CardTitle>
              <CardDescription>
                {bankUser.email} — Cliquez sur l'image pour changer votre photo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="full_name"
                rules={{ required: 'Le nom est obligatoire' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={userForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
                  name="job_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poste / Fonction</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={updateUserProfile.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateUserProfile.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
