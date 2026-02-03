import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { Case, CreateCaseDTO } from '@/types'

export function useCases() {
  const { userType, currentUser } = useAuth()

  return useQuery({
    queryKey: ['cases', userType, currentUser?.id],
    queryFn: async (): Promise<Case[]> => {
      let query = supabase
        .from('cases')
        .select(`
          *,
          bank:banks(*),
          debtor_pp:debtors_pp(*),
          debtor_pm:debtors_pm(*),
          assigned_agent:agents(*)
        `)

      // Agent : uniquement ses dossiers affectés
      if (userType === 'agent' && currentUser?.id) {
        query = query.eq('assigned_agent_id', currentUser.id)
      }

      // Bank user : uniquement les dossiers de sa banque
      if (userType === 'bank_user' && currentUser && 'bank_id' in currentUser) {
        query = query.eq('bank_id', currentUser.bank_id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data as Case[]
    },
    enabled: !!currentUser,
  })
}

// Création d'un dossier
export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (caseData: CreateCaseDTO): Promise<Case> => {
      const { data, error } = await supabase
        .from('cases')
        .insert([caseData as never])
        .select(`
          *,
          bank:banks(*),
          debtor_pp:debtors_pp(*),
          debtor_pm:debtors_pm(*)
        `)
        .single()

      if (error) throw error
      return data as Case
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['debtor-counts-by-bank'] })
    },
  })
}
