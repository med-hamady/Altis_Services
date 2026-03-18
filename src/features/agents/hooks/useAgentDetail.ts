import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Case, Action } from '@/types'

// Stats de l'agent (admin peut appeler pour n'importe quel agent)
export function useAgentStats(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent-stats', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_agent_stats' as never, { p_agent_id: agentId! } as never)

      if (error) throw error
      return data as {
        myCases: number
        casesToProcess: number
        upcomingPromises: number
        closedThisMonth: number
      }
    },
    enabled: !!agentId,
  })
}

// Tous les dossiers assignés à cet agent (actifs + clôturés)
export function useAgentCases(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent-cases', agentId],
    queryFn: async (): Promise<Case[]> => {
      const { data, error } = await supabase
        .from('cases')
        .select(`
          *,
          bank:banks(id, name, code),
          debtor_pp:debtors_pp(id, first_name, last_name),
          debtor_pm:debtors_pm(id, company_name)
        `)
        .eq('assigned_agent_id', agentId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Case[]
    },
    enabled: !!agentId,
  })
}

export interface ActionWithCase extends Action {
  case_info?: {
    id: string
    reference: string
    status: string
  }
}

// Toutes les actions sur les dossiers de cet agent (peu importe qui les a créées)
export function useAgentActions(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent-actions', agentId],
    queryFn: async (): Promise<ActionWithCase[]> => {
      // 1. Récupérer les IDs des dossiers assignés à cet agent
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('id')
        .eq('assigned_agent_id', agentId!)

      if (casesError) throw casesError

      const caseIds = (casesData ?? []).map((c) => (c as { id: string }).id)
      if (caseIds.length === 0) return []

      // 2. Récupérer toutes les actions sur ces dossiers
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          case_info:cases!actions_case_id_fkey(id, reference, status)
        `)
        .in('case_id', caseIds)
        .order('action_date', { ascending: false })
        .limit(200)

      if (error) throw error
      return (data ?? []) as ActionWithCase[]
    },
    enabled: !!agentId,
  })
}
