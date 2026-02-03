import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Bank, BankUser } from '@/types'

type BankInput = Omit<Bank, 'id' | 'created_at' | 'updated_at'>

// Hook pour récupérer toutes les banques
export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: async (): Promise<Bank[]> => {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name')

      if (error) throw error
      return data as Bank[]
    },
  })
}

// Hook pour récupérer une banque par ID
export function useBank(id: string | null) {
  return useQuery({
    queryKey: ['banks', id],
    queryFn: async (): Promise<Bank | null> => {
      if (!id) return null

      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Bank
    },
    enabled: !!id,
  })
}

// Hook pour créer une banque
export function useCreateBank() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bank: BankInput) => {
      const { data, error } = await supabase
        .from('banks')
        .insert([bank as never])
        .select()
        .single()

      if (error) throw error
      return data as Bank
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] })
    },
  })
}

// Hook pour modifier une banque
export function useUpdateBank() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, bank }: { id: string; bank: Partial<BankInput> }) => {
      const { data, error } = await supabase
        .from('banks')
        .update(bank as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Bank
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['banks'] })
      queryClient.invalidateQueries({ queryKey: ['banks', variables.id] })
    },
  })
}

// Hook pour supprimer une banque
export function useDeleteBank() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] })
    },
  })
}

// Hook pour modifier le profil d'une banque (par un bank_user)
export function useUpdateBankProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<Bank, 'name' | 'address' | 'city' | 'phone' | 'email' | 'logo_url'>> }) => {
      const { data: result, error } = await supabase
        .from('banks')
        .update(data as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result as Bank
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['banks'] })
      queryClient.invalidateQueries({ queryKey: ['banks', variables.id] })
    },
  })
}

// Hook pour modifier le profil d'un bank_user
export function useUpdateBankUserProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<BankUser, 'full_name' | 'phone' | 'job_title' | 'avatar_url'>> }) => {
      const { data: result, error } = await supabase
        .from('bank_users')
        .update(data as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result as BankUser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-users'] })
    },
  })
}

// Hook pour activer/désactiver une banque
export function useToggleBankStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('banks')
        .update({ is_active: isActive } as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Bank
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['banks'] })
      queryClient.invalidateQueries({ queryKey: ['banks', variables.id] })
    },
  })
}
