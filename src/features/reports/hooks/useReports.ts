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
        .from('cases')
        .select(`
          *,
          bank:banks(*),
          debtor_pp:debtors_pp(*),
          debtor_pm:debtors_pm(*),
          assigned_agent:agents(*)
        `)
        .eq('bank_id', bankId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as Case[]
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

      const { data: cases, error } = await supabase
        .from('cases')
        .select('status, amount_principal, amount_interest, amount_penalties, amount_fees, total_paid, remaining_balance')
        .eq('bank_id', bankId)

      if (error) throw error
      if (!cases) return null

      const typedCases = cases as unknown as { status: string; amount_principal: number; amount_interest: number; amount_penalties: number; amount_fees: number; total_paid: number; remaining_balance: number }[]

      const stats = {
        totalCases: typedCases.length,
        byStatus: {} as Record<string, number>,
        totalAmount: 0,
        totalPrincipal: 0,
        totalInterest: 0,
        totalPenalties: 0,
        totalFees: 0,
        totalPaid: 0,
        totalRemainingBalance: 0,
      }

      typedCases.forEach((c) => {
        // Par statut
        stats.byStatus[c.status] = (stats.byStatus[c.status] || 0) + 1

        // Montants (Math.abs pour gérer les montants négatifs importés)
        const principal = Math.abs(c.amount_principal || 0)
        const interest = Math.abs(c.amount_interest || 0)
        const penalties = Math.abs(c.amount_penalties || 0)
        const fees = Math.abs(c.amount_fees || 0)
        const total = principal + interest + penalties + fees

        stats.totalPrincipal += principal
        stats.totalInterest += interest
        stats.totalPenalties += penalties
        stats.totalFees += fees
        stats.totalAmount += total
        stats.totalPaid += (c.total_paid || 0)
        stats.totalRemainingBalance += (c.remaining_balance ?? total)
      })

      return stats
    },
    enabled: !!bankId,
  })
}
