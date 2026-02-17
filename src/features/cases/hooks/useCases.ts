import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { Case, CreateCaseDTO } from '@/types'

export function useCases() {
  const { userType, currentUser } = useAuth()

  return useQuery({
    queryKey: ['cases', userType, currentUser?.id],
    queryFn: async (): Promise<Case[]> => {
      const bankId = userType === 'bank_user' && currentUser && 'bank_id' in currentUser
        ? currentUser.bank_id
        : null

      const { data, error } = await supabase
        .rpc('list_cases' as never, {
          p_user_id: currentUser?.id || null,
          p_role: userType || 'admin',
          p_bank_id: bankId,
        } as never)

      if (error) throw error
      return (data ?? []) as Case[]
    },
    enabled: !!currentUser,
  })
}

// Dossiers clôturés (archive)
export function useArchivedCases() {
  const { userType, currentUser } = useAuth()

  return useQuery({
    queryKey: ['cases', 'archived', userType, currentUser?.id],
    queryFn: async (): Promise<Case[]> => {
      const bankId = userType === 'bank_user' && currentUser && 'bank_id' in currentUser
        ? currentUser.bank_id
        : null

      const { data, error } = await supabase
        .rpc('list_archived_cases' as never, {
          p_user_id: currentUser?.id || null,
          p_role: userType || 'admin',
          p_bank_id: bankId,
        } as never)

      if (error) throw error
      return (data ?? []) as Case[]
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
        .rpc('create_case' as never, {
          p_data: caseData,
        } as never)

      if (error) throw error
      return data as Case
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['debtor-counts-by-bank'] })
    },
  })
}
