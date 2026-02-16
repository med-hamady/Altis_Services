import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from './supabase/client'

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

interface SendEmailResponse {
  success: boolean
  id?: string
  error?: string
  detail?: unknown
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResponse> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: params,
  })

  if (error) {
    throw new Error(error.message || "Erreur lors de l'envoi de l'email")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data as SendEmailResponse
}

export function useSendEmail() {
  return useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      toast.success('Email envoyé avec succès')
    },
    onError: (error: Error) => {
      toast.error(`Erreur envoi email : ${error.message}`)
    },
  })
}
