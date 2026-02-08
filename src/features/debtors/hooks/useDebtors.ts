import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { DebtorPP, DebtorPM } from '@/types'

export function useDebtorsPP() {
  return useQuery({
    queryKey: ['debtors-pp'],
    queryFn: async (): Promise<DebtorPP[]> => {
      const { data, error } = await supabase
        .from('debtors_pp')
        .select('*')
        .order('last_name', { ascending: true })

      if (error) throw error
      return data as DebtorPP[]
    },
  })
}

export function useDebtorsPM() {
  return useQuery({
    queryKey: ['debtors-pm'],
    queryFn: async (): Promise<DebtorPM[]> => {
      const { data, error } = await supabase
        .from('debtors_pm')
        .select('*')
        .order('company_name', { ascending: true })

      if (error) throw error
      return data as DebtorPM[]
    },
  })
}

// Débiteurs PP liés à une banque (via cases)
export function useDebtorsPPByBank(bankId: string) {
  return useQuery({
    queryKey: ['debtors-pp', 'bank', bankId],
    queryFn: async (): Promise<DebtorPP[]> => {
      // Récupérer les debtor_pp_id distincts depuis les cases de cette banque
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('debtor_pp_id')
        .eq('bank_id', bankId)
        .not('debtor_pp_id', 'is', null)

      if (casesError) throw casesError
      if (!cases || cases.length === 0) return []

      const typedCases = cases as unknown as { debtor_pp_id: string }[]
      const debtorIds = [...new Set(typedCases.map((c) => c.debtor_pp_id))]

      const { data, error } = await supabase
        .from('debtors_pp')
        .select('*')
        .in('id', debtorIds)
        .order('last_name', { ascending: true })

      if (error) throw error
      return data as DebtorPP[]
    },
    enabled: !!bankId,
  })
}

// Débiteurs PM liés à une banque (via cases)
export function useDebtorsPMByBank(bankId: string) {
  return useQuery({
    queryKey: ['debtors-pm', 'bank', bankId],
    queryFn: async (): Promise<DebtorPM[]> => {
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('debtor_pm_id')
        .eq('bank_id', bankId)
        .not('debtor_pm_id', 'is', null)

      if (casesError) throw casesError
      if (!cases || cases.length === 0) return []

      const typedCases = cases as unknown as { debtor_pm_id: string }[]
      const debtorIds = [...new Set(typedCases.map((c) => c.debtor_pm_id))]

      const { data, error } = await supabase
        .from('debtors_pm')
        .select('*')
        .in('id', debtorIds)
        .order('company_name', { ascending: true })

      if (error) throw error
      return data as DebtorPM[]
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
        .from('cases')
        .select('bank_id, debtor_pp_id, debtor_pm_id')

      if (error) throw error
      if (!data) return {}

      const typedData = data as unknown as { bank_id: string; debtor_pp_id: string | null; debtor_pm_id: string | null }[]
      const counts: Record<string, { pp: Set<string>; pm: Set<string> }> = {}

      for (const c of typedData) {
        if (!counts[c.bank_id]) {
          counts[c.bank_id] = { pp: new Set(), pm: new Set() }
        }
        if (c.debtor_pp_id) counts[c.bank_id].pp.add(c.debtor_pp_id)
        if (c.debtor_pm_id) counts[c.bank_id].pm.add(c.debtor_pm_id)
      }

      const result: Record<string, { pp: number; pm: number }> = {}
      for (const [bankId, sets] of Object.entries(counts)) {
        result[bankId] = { pp: sets.pp.size, pm: sets.pm.size }
      }
      return result
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
        .from('debtors_pp')
        .insert([debtor as never])
        .select()
        .single()

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
        .from('debtors_pm')
        .insert([debtor as never])
        .select()
        .single()

      if (error) throw error
      return data as DebtorPM
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtors-pm'] })
      queryClient.invalidateQueries({ queryKey: ['debtor-counts-by-bank'] })
    },
  })
}
