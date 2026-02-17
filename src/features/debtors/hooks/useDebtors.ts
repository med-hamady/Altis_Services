import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { DebtorPP, DebtorPM } from '@/types'

export function useDebtorsPP() {
  return useQuery({
    queryKey: ['debtors-pp'],
    queryFn: async (): Promise<DebtorPP[]> => {
      const { data, error } = await supabase
        .rpc('list_debtors_pp' as never)

      if (error) throw error
      return (data ?? []) as DebtorPP[]
    },
  })
}

export function useDebtorsPM() {
  return useQuery({
    queryKey: ['debtors-pm'],
    queryFn: async (): Promise<DebtorPM[]> => {
      const { data, error } = await supabase
        .rpc('list_debtors_pm' as never)

      if (error) throw error
      return (data ?? []) as DebtorPM[]
    },
  })
}

// Débiteurs PP liés à une banque (via cases)
export function useDebtorsPPByBank(bankId: string) {
  return useQuery({
    queryKey: ['debtors-pp', 'bank', bankId],
    queryFn: async (): Promise<DebtorPP[]> => {
      const { data, error } = await supabase
        .rpc('list_debtors_pp_by_bank' as never, { p_bank_id: bankId } as never)

      if (error) throw error
      return (data ?? []) as DebtorPP[]
    },
    enabled: !!bankId,
  })
}

// Débiteurs PM liés à une banque (via cases)
export function useDebtorsPMByBank(bankId: string) {
  return useQuery({
    queryKey: ['debtors-pm', 'bank', bankId],
    queryFn: async (): Promise<DebtorPM[]> => {
      const { data, error } = await supabase
        .rpc('list_debtors_pm_by_bank' as never, { p_bank_id: bankId } as never)

      if (error) throw error
      return (data ?? []) as DebtorPM[]
    },
    enabled: !!bankId,
  })
}

// Nombre de débiteurs par banque (pour la page de sélection)
export function useDebtorCountsByBank() {
  return useQuery({
    queryKey: ['debtor-counts-by-bank'],
    queryFn: async (): Promise<Record<string, { pp: number; pm: number }>> => {
      const { data, error } = await supabase
        .rpc('get_debtor_counts_by_bank' as never)

      if (error) throw error
      return (data ?? {}) as Record<string, { pp: number; pm: number }>
    },
  })
}

// Création d'un débiteur PP
export type CreateDebtorPPInput = Omit<DebtorPP, 'id' | 'created_at' | 'updated_at'>

export function useCreateDebtorPP() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (debtor: CreateDebtorPPInput): Promise<DebtorPP> => {
      const { data, error } = await supabase
        .rpc('create_debtor_pp' as never, { p_data: debtor } as never)

      if (error) throw error
      return data as DebtorPP
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtors-pp'] })
      queryClient.invalidateQueries({ queryKey: ['debtor-counts-by-bank'] })
    },
  })
}

// Création d'un débiteur PM
export type CreateDebtorPMInput = Omit<DebtorPM, 'id' | 'created_at' | 'updated_at'>

export function useCreateDebtorPM() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (debtor: CreateDebtorPMInput): Promise<DebtorPM> => {
      const { data, error } = await supabase
        .rpc('create_debtor_pm' as never, { p_data: debtor } as never)

      if (error) throw error
      return data as DebtorPM
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtors-pm'] })
      queryClient.invalidateQueries({ queryKey: ['debtor-counts-by-bank'] })
    },
  })
}
