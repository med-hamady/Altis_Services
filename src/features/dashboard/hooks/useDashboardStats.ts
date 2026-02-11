import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

// Types pour les statistiques
export interface AdminStats {
  totalCases: number
  casesInProgress: number
  activeBanks: number
  activeAgents: number
}

export interface AgentStats {
  myCases: number
  casesToProcess: number
  upcomingPromises: number
  closedThisMonth: number
}

export interface BankUserStats {
  totalCases: number
  casesInRecovery: number
  recoveryRate: number
  amountRecovered: number
}

// Hook pour les statistiques Admin
export function useAdminStats(enabled: boolean = true) {
  return useQuery({
    queryKey: ['dashboard', 'admin-stats'],
    enabled,
    queryFn: async (): Promise<AdminStats> => {
      // Total des dossiers
      const { count: totalCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })

      // Dossiers en cours (non clos)
      const { count: casesInProgress } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'closed')

      // Banques actives
      const { count: activeBanks } = await supabase
        .from('banks')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Agents actifs
      const { count: activeAgents } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      return {
        totalCases: totalCases || 0,
        casesInProgress: casesInProgress || 0,
        activeBanks: activeBanks || 0,
        activeAgents: activeAgents || 0,
      }
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  })
}

// Hook pour les statistiques Agent
export function useAgentStats(enabled: boolean = true) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['dashboard', 'agent-stats', user?.id],
    enabled: enabled && !!user?.id,
    queryFn: async (): Promise<AgentStats> => {
      if (!user?.id) throw new Error('User not authenticated')

      // Mes dossiers
      const { count: myCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_agent_id', user.id)

      // Dossiers à traiter (nouveau ou en cours, non clos)
      const { count: casesToProcess } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_agent_id', user.id)
        .in('status', ['new', 'assigned', 'in_progress'])

      // Promesses à venir (7 prochains jours)
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      const { count: upcomingPromises } = await supabase
        .from('promises')
        .select('case_id, cases!inner(assigned_agent_id)', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lte('promise_date', sevenDaysFromNow.toISOString().split('T')[0])
        .eq('cases.assigned_agent_id', user.id)

      // Dossiers clos ce mois
      const firstDayOfMonth = new Date()
      firstDayOfMonth.setDate(1)
      firstDayOfMonth.setHours(0, 0, 0, 0)

      const { count: closedThisMonth } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_agent_id', user.id)
        .eq('status', 'closed')
        .gte('closed_at', firstDayOfMonth.toISOString())

      return {
        myCases: myCases || 0,
        casesToProcess: casesToProcess || 0,
        upcomingPromises: upcomingPromises || 0,
        closedThisMonth: closedThisMonth || 0,
      }
    },
    refetchInterval: 30000,
  })
}

// Hook pour les statistiques Utilisateur Banque
export function useBankUserStats(bankId: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'bank-stats', bankId],
    queryFn: async (): Promise<BankUserStats> => {
      if (!bankId) throw new Error('Bank ID not provided')

      // Total des dossiers de la banque
      const { count: totalCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('bank_id', bankId)

      // Dossiers en recouvrement (non clos)
      const { count: casesInRecovery } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('bank_id', bankId)
        .neq('status', 'closed')

      // Calculer le taux de recouvrement et montant recouvré
      const { data: cases } = await supabase
        .from('cases')
        .select('id, amount_principal, amount_interest, amount_penalties, amount_fees')
        .eq('bank_id', bankId)

      type CaseAmount = {
        id: string
        amount_principal: number
        amount_interest: number
        amount_penalties: number
        amount_fees: number
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('case_id, amount')
        .eq('status', 'validated')
        .in('case_id', (cases as CaseAmount[] || []).map(c => c.id))

      type PaymentAmount = {
        case_id: string
        amount: number
      }

      // Calculer montant total dû (Math.abs pour gérer les montants négatifs importés)
      const totalDue = (cases as CaseAmount[] || []).reduce((sum, c) => {
        return sum + Math.abs(
          (c.amount_principal || 0) + (c.amount_interest || 0) +
          (c.amount_penalties || 0) + (c.amount_fees || 0)
        )
      }, 0)

      // Calculer montant recouvré total
      const totalRecovered = (payments as PaymentAmount[] || []).reduce((sum, p) => sum + (p.amount || 0), 0)

      // Montant recouvré ce mois
      const firstDayOfMonth = new Date()
      firstDayOfMonth.setDate(1)
      firstDayOfMonth.setHours(0, 0, 0, 0)

      const { data: monthlyPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'validated')
        .in('case_id', (cases as CaseAmount[] || []).map(c => c.id))
        .gte('payment_date', firstDayOfMonth.toISOString().split('T')[0])

      const amountRecoveredThisMonth = (monthlyPayments as { amount: number }[] || []).reduce((sum, p) => sum + (p.amount || 0), 0)

      // Taux de recouvrement (%)
      const recoveryRate = totalDue > 0 ? (totalRecovered / totalDue) * 100 : 0

      return {
        totalCases: totalCases || 0,
        casesInRecovery: casesInRecovery || 0,
        recoveryRate: Math.round(recoveryRate),
        amountRecovered: amountRecoveredThisMonth,
      }
    },
    enabled: !!bankId,
    refetchInterval: 30000,
  })
}
