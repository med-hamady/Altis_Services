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
        .select('status, priority, amount_principal, amount_interest, amount_penalties, amount_fees')
        .eq('bank_id', bankId)

      if (error) throw error
      if (!cases) return null

      const stats = {
        totalCases: cases.length,
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        totalAmount: 0,
        totalPrincipal: 0,
        totalInterest: 0,
        totalPenalties: 0,
        totalFees: 0,
        totalPaid: 0,
        totalRemainingBalance: 0,
      }

      cases.forEach((c) => {
        // Par statut
        stats.byStatus[c.status] = (stats.byStatus[c.status] || 0) + 1

        // Par priorité
        stats.byPriority[c.priority] = (stats.byPriority[c.priority] || 0) + 1

        // Montants
        const principal = c.amount_principal || 0
        const interest = c.amount_interest || 0
        const penalties = c.amount_penalties || 0
        const fees = c.amount_fees || 0
        const total = principal + interest + penalties + fees

        stats.totalPrincipal += principal
        stats.totalInterest += interest
        stats.totalPenalties += penalties
        stats.totalFees += fees
        stats.totalAmount += total
        // Solde restant = montant total (pas de paiements enregistrés pour l'instant)
        stats.totalRemainingBalance += total
      })

      return stats
    },
    enabled: !!bankId,
  })
}
