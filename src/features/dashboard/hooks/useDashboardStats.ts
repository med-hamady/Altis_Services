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
  const { isAdmin, isAgent, isBankUser, bankId } = usePermissions()

  return useQuery({
    queryKey: ['dashboard', 'recent-actions', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<RecentAction[]> => {
      let query = supabase
        .from('actions')
        .select(`
          id, action_type, result, action_date, notes, case_id,
          cases!inner(reference, assigned_agent_id, bank_id,
            debtor_pp:debtors_pp(first_name, last_name),
            debtor_pm:debtors_pm(company_name)
          )
        `)
        .order('action_date', { ascending: false })
        .limit(10)

      if (isAgent && !isAdmin) {
        query = query.eq('cases.assigned_agent_id', user!.id)
      } else if (isBankUser && bankId) {
        query = query.eq('cases.bank_id', bankId)
      }

      const { data, error } = await query
      if (error) throw error

      type ActionRow = {
        id: string
        action_type: ActionType
        result: ActionResult
        action_date: string
        notes: string | null
        case_id: string
        cases: {
          reference: string
          assigned_agent_id: string | null
          bank_id: string | null
          debtor_pp: { first_name: string; last_name: string } | null
          debtor_pm: { company_name: string } | null
        }
      }

      return ((data as unknown as ActionRow[]) || []).map((row) => {
        const c = row.cases
        const debtorName = c.debtor_pm?.company_name
          || (c.debtor_pp ? `${c.debtor_pp.first_name} ${c.debtor_pp.last_name}` : 'Inconnu')

        return {
          id: row.id,
          action_type: row.action_type,
          result: row.result,
          action_date: row.action_date,
          notes: row.notes,
          case_id: row.case_id,
          case_reference: c.reference,
          debtor_name: debtorName,
        }
      })
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
  payment_method: string | null
  status: string
  case_id: string
  case_reference: string
  debtor_name: string
}

export function useUpcomingPromises() {
  const { user } = useAuth()
  const { isAdmin, isAgent, isBankUser, bankId } = usePermissions()

  return useQuery({
    queryKey: ['dashboard', 'upcoming-promises', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UpcomingPromise[]> => {
      const today = new Date().toISOString().split('T')[0]
      const sevenDays = new Date()
      sevenDays.setDate(sevenDays.getDate() + 7)
      const sevenDaysStr = sevenDays.toISOString().split('T')[0]

      let query = supabase
        .from('promises')
        .select(`
          id, amount, due_date, payment_method, status, case_id,
          cases!inner(reference, assigned_agent_id, bank_id,
            debtor_pp:debtors_pp(first_name, last_name),
            debtor_pm:debtors_pm(company_name)
          )
        `)
        .eq('status', 'pending')
        .gte('due_date', today)
        .lte('due_date', sevenDaysStr)
        .order('due_date', { ascending: true })

      if (isAgent && !isAdmin) {
        query = query.eq('cases.assigned_agent_id', user!.id)
      } else if (isBankUser && bankId) {
        query = query.eq('cases.bank_id', bankId)
      }

      const { data, error } = await query
      if (error) throw error

      type PromiseRow = {
        id: string
        amount: number
        due_date: string
        payment_method: string | null
        status: string
        case_id: string
        cases: {
          reference: string
          assigned_agent_id: string | null
          bank_id: string | null
          debtor_pp: { first_name: string; last_name: string } | null
          debtor_pm: { company_name: string } | null
        }
      }

      return ((data as unknown as PromiseRow[]) || []).map((row) => {
        const c = row.cases
        const debtorName = c.debtor_pm?.company_name
          || (c.debtor_pp ? `${c.debtor_pp.first_name} ${c.debtor_pp.last_name}` : 'Inconnu')

        return {
          id: row.id,
          amount: row.amount,
          due_date: row.due_date,
          payment_method: row.payment_method,
          status: row.status,
          case_id: row.case_id,
          case_reference: c.reference,
          debtor_name: debtorName,
        }
      })
    },
    refetchInterval: 30000,
  })
}
