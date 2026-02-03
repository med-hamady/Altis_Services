import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Case, Action, Payment, Document } from '@/types'
import type { Promise as CasePromise } from '@/types'
import type { ActionType, ActionResult } from '@/types/enums'

export function useCaseDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: async (): Promise<Case> => {
      const { data, error } = await supabase
        .from('cases')
        .select(`
          *,
          bank:banks(*),
          debtor_pp:debtors_pp(*),
          debtor_pm:debtors_pm(*),
          assigned_agent:agents(*)
        `)
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as Case
    },
    enabled: !!id,
  })
}

export function useAssignAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ caseId, agentId }: { caseId: string; agentId: string | null }) => {
      const { data, error } = await supabase
        .from('cases')
        .update({
          assigned_agent_id: agentId,
          status: agentId ? 'assigned' : 'new',
        } as never)
        .eq('id', caseId)
        .select()
        .single()

      if (error) throw error
      return data as Case
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.caseId] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

export function useCaseActions(caseId: string | undefined) {
  return useQuery({
    queryKey: ['cases', caseId, 'actions'],
    queryFn: async (): Promise<Action[]> => {
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('case_id', caseId!)
        .order('action_date', { ascending: false })

      if (error) throw error
      return data as Action[]
    },
    enabled: !!caseId,
  })
}

export function useCasePromises(caseId: string | undefined) {
  return useQuery({
    queryKey: ['cases', caseId, 'promises'],
    queryFn: async (): Promise<CasePromise[]> => {
      const { data, error } = await supabase
        .from('promises')
        .select('*')
        .eq('case_id', caseId!)
        .order('due_date', { ascending: false })

      if (error) throw error
      return data as CasePromise[]
    },
    enabled: !!caseId,
  })
}

export function useCasePayments(caseId: string | undefined) {
  return useQuery({
    queryKey: ['cases', caseId, 'payments'],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('case_id', caseId!)
        .order('payment_date', { ascending: false })

      if (error) throw error
      return data as Payment[]
    },
    enabled: !!caseId,
  })
}

export function useCaseDocuments(caseId: string | undefined) {
  return useQuery({
    queryKey: ['cases', caseId, 'documents'],
    queryFn: async (): Promise<Document[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('case_id', caseId!)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      return data as Document[]
    },
    enabled: !!caseId,
  })
}

// =============================================================================
// MUTATIONS : Créer une action
// =============================================================================

interface CreateActionInput {
  case_id: string
  action_type: ActionType
  action_date: string
  result: ActionResult
  notes?: string
  next_action_type?: ActionType
  next_action_date?: string
  next_action_notes?: string
}

export function useCreateAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateActionInput) => {
      const { data, error } = await supabase
        .from('actions')
        .insert([input as never])
        .select()
        .single()

      if (error) throw error
      return data as Action
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'actions'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id] })
    },
  })
}

// =============================================================================
// MUTATIONS : Créer une promesse
// =============================================================================

interface CreatePromiseInput {
  case_id: string
  amount: number
  due_date: string
  payment_method?: string
  reference?: string
  notes?: string
}

export function useCreatePromise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePromiseInput) => {
      const { data, error } = await supabase
        .from('promises')
        .insert([input as never])
        .select()
        .single()

      if (error) throw error
      return data as CasePromise
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'promises'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id] })
    },
  })
}

// =============================================================================
// MUTATIONS : Déclarer un paiement
// =============================================================================

interface CreatePaymentInput {
  case_id: string
  amount: number
  payment_date: string
  payment_method?: string
  transaction_reference?: string
  receipt_path?: string
}

export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const { data, error } = await supabase
        .from('payments')
        .insert([input as never])
        .select()
        .single()

      if (error) throw error
      return data as Payment
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'payments'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id] })
    },
  })
}
