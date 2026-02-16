import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
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
import { Upload, X, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { usePermissions } from '@/contexts/AuthContext'
import { useCreatePayment } from '../hooks/useCaseDetail'
import { sendEmail } from '@/lib/email'

const PAYMENT_METHODS = [
  { value: 'virement', label: 'Virement' },
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'autre', label: 'Autre' },
]

interface PaymentFormData {
  amount: string
  payment_date: string
  payment_method: string
  transaction_reference: string
}

interface AddPaymentDialogProps {
  caseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Solde restant du dossier pour validation du montant */
  remainingBalance?: number
  /** Montant pré-rempli (ex: depuis une promesse tenue) */
  defaultAmount?: number
  /** Référence du dossier (pour la notification email) */
  caseReference?: string
  /** Nom du débiteur (pour la notification email) */
  debtorName?: string
  /** Nom de la banque (pour la notification email) */
  bankName?: string
}

export function AddPaymentDialog({ caseId, open, onOpenChange, remainingBalance, defaultAmount, caseReference, debtorName, bankName }: AddPaymentDialogProps) {
  const createPayment = useCreatePayment()
  const { isAdmin } = usePermissions()
  const [serverError, setServerError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<PaymentFormData>({
    defaultValues: {
      amount: '',
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: '',
      transaction_reference: '',
    },
  })

  // Rafraîchir le formulaire à chaque ouverture
  useEffect(() => {
    if (open) {
      form.reset({
        amount: defaultAmount ? String(defaultAmount) : '',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: '',
        transaction_reference: '',
      })
      setServerError(null)
      setSelectedFile(null)
    }
  }, [open, form, defaultAmount])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Valider taille (max 5MB) et type
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 5 Mo')
        return
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Format accepté : JPG, PNG, WebP ou PDF')
        return
      }
      setSelectedFile(file)
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const fileName = `${caseId}/payment_${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('case_documents')
      .upload(fileName, file)

    if (error) {
      console.error('Upload error:', error)
      return null
    }
    return fileName
  }

  const onSubmit = async (data: PaymentFormData) => {
    setServerError(null)
    setUploading(true)
    try {
      let receiptPath: string | undefined

      // Upload du justificatif si présent
      if (selectedFile) {
        const path = await uploadFile(selectedFile)
        if (!path) {
          toast.error('Erreur lors de l\'upload du justificatif')
          setUploading(false)
          return
        }
        receiptPath = path
      }

      const amount = parseFloat(data.amount)
      const method = PAYMENT_METHODS.find(m => m.value === data.payment_method)?.label || data.payment_method

      await createPayment.mutateAsync({
        case_id: caseId,
        amount,
        payment_date: data.payment_date,
        payment_method: data.payment_method || undefined,
        transaction_reference: data.transaction_reference || undefined,
        receipt_path: receiptPath,
        isAdmin,
      })
      toast.success(
        isAdmin
          ? 'Paiement déclaré et validé avec succès'
          : 'Paiement déclaré avec succès (en attente de validation)'
      )
      onOpenChange(false)
      form.reset()

      // Notification email aux admins (fire-and-forget, ne bloque pas le flux)
      if (!isAdmin) {
        supabase
          .from('admins')
          .select('email')
          .eq('is_active', true)
          .then(({ data: admins }) => {
            const emails = admins?.map(a => a.email).filter(Boolean) as string[] | undefined
            if (emails && emails.length > 0) {
              sendEmail({
                to: emails,
                subject: `Nouveau paiement déclaré — Dossier ${caseReference || caseId}`,
                html: `
                  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                    <h2 style="color:#1a56db;margin-bottom:16px">Nouveau paiement à valider</h2>
                    <table style="width:100%;border-collapse:collapse">
                      <tr><td style="padding:8px 0;color:#6b7280">Dossier</td><td style="padding:8px 0;font-weight:600">${caseReference || caseId}</td></tr>
                      <tr><td style="padding:8px 0;color:#6b7280">Débiteur</td><td style="padding:8px 0;font-weight:600">${debtorName || '—'}</td></tr>
                      <tr><td style="padding:8px 0;color:#6b7280">Banque</td><td style="padding:8px 0;font-weight:600">${bankName || '—'}</td></tr>
                      <tr><td style="padding:8px 0;color:#6b7280">Montant</td><td style="padding:8px 0;font-weight:600">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MRU', minimumFractionDigits: 0 }).format(amount)}</td></tr>
                      <tr><td style="padding:8px 0;color:#6b7280">Date</td><td style="padding:8px 0">${data.payment_date}</td></tr>
                      <tr><td style="padding:8px 0;color:#6b7280">Mode</td><td style="padding:8px 0">${method}</td></tr>
                      ${data.transaction_reference ? `<tr><td style="padding:8px 0;color:#6b7280">Référence</td><td style="padding:8px 0">${data.transaction_reference}</td></tr>` : ''}
                    </table>
                    <p style="margin-top:20px;color:#6b7280;font-size:14px">Connectez-vous à la plateforme pour valider ou rejeter ce paiement.</p>
                    <p style="margin-top:8px;color:#9ca3af;font-size:12px">— Altis Services</p>
                  </div>
                `,
              }).catch(() => {
                // Silencieux : l'email est secondaire, ne pas bloquer l'UX
              })
            }
          })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      setServerError(message)
      toast.error('Erreur lors de la déclaration du paiement')
    } finally {
      setUploading(false)
    }
  }

  const isSubmitting = createPayment.isPending || uploading

  const formatMRU = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MRU', minimumFractionDigits: 0 }).format(amount)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Déclarer un paiement</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? 'Déclarer un paiement reçu du débiteur (validé automatiquement)'
              : 'Déclarer un paiement reçu du débiteur (sera soumis à validation)'}
            {remainingBalance != null && (
              <span className={`block mt-1 font-medium ${remainingBalance <= 0 ? 'text-green-600' : ''}`}>
                Solde restant : {formatMRU(remainingBalance)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                rules={{
                  required: 'Montant requis',
                  validate: (v) => {
                    const num = parseFloat(v)
                    if (isNaN(num) || num <= 0) return 'Montant invalide'
                    if (remainingBalance != null && remainingBalance > 0 && num > remainingBalance) {
                      return `Le montant ne peut pas dépasser le solde restant (${formatMRU(remainingBalance)})`
                    }
                    return true
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (MRU) *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_date"
                rules={{ required: 'Date requise' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date du paiement *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_method"
              rules={{ required: 'Mode de paiement requis' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de paiement *</FormLabel>
                  <Select onValueChange={(val) => {
                    field.onChange(val)
                    // Effacer l'erreur de référence si on passe en espèces
                    if (val === 'especes') {
                      form.clearErrors('transaction_reference')
                    }
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transaction_reference"
              rules={{
                validate: (v) => {
                  const method = form.getValues('payment_method')
                  if (method === 'especes') return true
                  if (!v || !v.trim()) return 'Référence de transaction requise'
                  return true
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Référence de transaction {form.watch('payment_method') !== 'especes' && '*'}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: N° de reçu, réf. virement..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload justificatif */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Justificatif (photo/PDF)</p>
              {selectedFile ? (
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(0)} Ko
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Ajouter un justificatif
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP ou PDF — max 5 Mo
              </p>
            </div>

            {serverError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Déclaration...' : 'Déclarer le paiement'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
