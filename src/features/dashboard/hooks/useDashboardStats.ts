import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth, usePermissions } from '@/contexts/AuthContext'
import type { ActionType, ActionResult } from '@/types/enums'

// Types pour les statistiques
export interface AdminStats {
  totalCases: number
  casesInProgress: number
  activeBanks: number
  activeAgents: number
  casesWithGuarantee: number
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
      const { data, error } = await supabase
        .rpc('get_admin_stats' as never)

      if (error) throw error
      return data as AdminStats
    },
    refetchInterval: 30000,
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

      const { data, error } = await supabase
        .rpc('get_agent_stats' as never, { p_agent_id: user.id } as never)

      if (error) throw error
      return data as AgentStats
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

      const { data, error } = await supabase
        .rpc('get_bank_user_stats' as never, { p_bank_id: bankId } as never)

      if (error) throw error
      return data as BankUserStats
    },
    enabled: !!bankId,
    refetchInterval: 30000,
  })
}

// ====================================================================
// Activité récente (dernières actions)
// ====================================================================

export interface RecentAction {
  id: string
  action_type: ActionType
  result: ActionResult
  action_date: string
  notes: string | null
  case_id: string
  case_reference: string
  debtor_name: string
}

export function useRecentActions() {
  const { user } = useAuth()
  const { isAdmin, isAgent, isBankUser } = usePermissions()

  const role = isAdmin ? 'admin' : isAgent ? 'agent' : isBankUser ? 'bank_user' : 'admin'

  return useQuery({
    queryKey: ['dashboard', 'recent-actions', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<RecentAction[]> => {
      const { data, error } = await supabase
        .rpc('get_recent_actions' as never, {
          p_user_id: user!.id,
          p_role: role,
        } as never)

      if (error) throw error
      return (data ?? []) as RecentAction[]
    },
    refetchInterval: 30000,
  })
}

// ====================================================================
// Promesses à venir (7 prochains jours)
// ====================================================================

export interface UpcomingPromise {
  id: string
  amount: number
  due_date: string
  status: string
  case_id: string
  case_reference: string
  debtor_name: string
}

export function useUpcomingPromises() {
  const { user } = useAuth()
  const { isAdmin, isAgent, isBankUser } = usePermissions()

  const role = isAdmin ? 'admin' : isAgent ? 'agent' : isBankUser ? 'bank_user' : 'admin'

  return useQuery({
    queryKey: ['dashboard', 'upcoming-promises', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UpcomingPromise[]> => {
      const { data, error } = await supabase
        .rpc('get_upcoming_promises' as never, {
          p_user_id: user!.id,
          p_role: role,
        } as never)

      if (error) throw error
      return (data ?? []) as UpcomingPromise[]
    },
    refetchInterval: 30000,
  })
}
