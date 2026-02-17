import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Case } from '@/types'

// Hook pour récupérer les dossiers d'une banque spécifique
export function useCasesByBank(bankId: string | null) {
  return useQuery({
    queryKey: ['cases-by-bank', bankId],
    queryFn: async (): Promise<Case[]> => {
      if (!bankId) return []

      const { data, error } = await supabase
        .rpc('get_bank_report_cases' as never, { p_bank_id: bankId } as never)

      if (error) throw error
      return (data ?? []) as Case[]
    },
    enabled: !!bankId,
  })
}

// Hook pour les statistiques globales d'une banque
export function useBankStats(bankId: string | null) {
  return useQuery({
    queryKey: ['bank-stats', bankId],
    queryFn: async () => {
      if (!bankId) return null

      const { data, error } = await supabase
        .rpc('get_bank_report_stats' as never, { p_bank_id: bankId } as never)

      if (error) throw error
      return data as {
        totalCases: number
        byStatus: Record<string, number>
        totalAmount: number
        totalPrincipal: number
        totalInterest: number
        totalPenalties: number
        totalFees: number
        totalPaid: number
        totalRemainingBalance: number
      }
    },
    enabled: !!bankId,
  })
}
