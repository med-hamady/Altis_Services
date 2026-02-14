import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Case, Action, Payment, Document, CaseExtraInfo } from '@/types'
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

// =============================================================================
// MUTATIONS : Modifier les informations d'un dossier
// =============================================================================

interface UpdateCaseInput {
  id: string
  phase?: string
  default_date?: string | null
  product_type?: string | null
  contract_reference?: string | null
  risk_level?: string | null
  amount_principal?: number
  amount_interest?: number
  amount_penalties?: number
  amount_fees?: number
  guarantee_description?: string | null
  notes?: string | null
  internal_notes?: string | null
}

export function useUpdateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCaseInput) => {
      const { data, error } = await supabase
        .from('cases')
        .update(updates as never)
        .eq('id', id)
        .select(`
          *,
          bank:banks(*),
          debtor_pp:debtors_pp(*),
          debtor_pm:debtors_pm(*),
          assigned_agent:agents(*)
        `)
        .single()

      if (error) throw error
      return data as Case
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases', data.id] })
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non authentifié')

      const { data, error } = await supabase
        .from('actions')
        .insert([{ ...input, created_by: user.id } as never])
        .select()
        .single()

      if (error) throw error
      return data as Action
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'actions'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non authentifié')

      const { data, error } = await supabase
        .from('promises')
        .insert([{ ...input, created_by: user.id } as never])
        .select()
        .single()

      if (error) throw error
      return data as CasePromise
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'promises'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

// =============================================================================
// MUTATIONS : Mettre à jour le statut d'une promesse
// =============================================================================

interface UpdatePromiseStatusInput {
  promise_id: string
  case_id: string
  status: 'kept' | 'broken' | 'rescheduled'
  status_notes?: string
  /** Nouvelle date d'échéance si replanification */
  new_due_date?: string
}

export function useUpdatePromiseStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdatePromiseStatusInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non authentifié')

      const updateData: Record<string, unknown> = {
        status: input.status,
        status_changed_at: new Date().toISOString(),
        status_changed_by: user.id,
        status_notes: input.status_notes || null,
      }

      if (input.status === 'rescheduled' && input.new_due_date) {
        updateData.due_date = input.new_due_date
      }

      const { data, error } = await supabase
        .from('promises')
        .update(updateData as never)
        .eq('id', input.promise_id)
        .select()
        .single()

      if (error) throw error
      return data as CasePromise
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'promises'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

export function useDeletePromise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ promise_id, case_id: _caseId }: { promise_id: string; case_id: string }) => {
      const { error } = await supabase
        .from('promises')
        .delete()
        .eq('id', promise_id)

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'promises'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
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
    mutationFn: async (input: CreatePaymentInput & { isAdmin?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non authentifié')

      const { isAdmin, ...paymentData } = input

      // Si l'admin déclare le paiement, il est validé directement
      const insertData = isAdmin
        ? {
            ...paymentData,
            declared_by: user.id,
            status: 'validated' as const,
            validated_by: user.id,
            validated_at: new Date().toISOString(),
          }
        : { ...paymentData, declared_by: user.id }

      const { data, error } = await supabase
        .from('payments')
        .insert([insertData as never])
        .select()
        .single()

      if (error) throw error
      return data as Payment
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'payments'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

// =============================================================================
// MUTATIONS : Valider / Rejeter un paiement
// =============================================================================

export function useValidatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { payment_id: string; case_id: string; approved: boolean; rejection_reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non authentifié')

      const updateData = input.approved
        ? {
            status: 'validated' as const,
            validated_by: user.id,
            validated_at: new Date().toISOString(),
          }
        : {
            status: 'rejected' as const,
            validated_by: user.id,
            validated_at: new Date().toISOString(),
            rejection_reason: input.rejection_reason || null,
          }

      const { data, error } = await supabase
        .from('payments')
        .update(updateData as never)
        .eq('id', input.payment_id)
        .select()
        .single()

      if (error) throw error
      return data as Payment
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'payments'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

// =============================================================================
// INFORMATIONS COMPLÉMENTAIRES
// =============================================================================

export function useCaseExtraInfo(caseId: string | undefined) {
  return useQuery({
    queryKey: ['cases', caseId, 'extra_info'],
    queryFn: async (): Promise<CaseExtraInfo[]> => {
      const { data, error } = await supabase
        .rpc('get_case_extra_info', { p_case_id: caseId! })

      if (error) throw error
      return data as CaseExtraInfo[]
    },
    enabled: !!caseId,
  })
}

export function useCreateExtraInfo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { case_id: string; label: string; value: string }) => {
      const { data, error } = await supabase
        .rpc('create_case_extra_info', {
          p_case_id: input.case_id,
          p_label: input.label,
          p_value: input.value,
        })

      if (error) throw error
      return data as CaseExtraInfo
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'extra_info'] })
    },
  })
}

export function useDeleteExtraInfo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, case_id: _caseId }: { id: string; case_id: string }) => {
      const { error } = await supabase
        .rpc('delete_case_extra_info', { p_id: id })

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'extra_info'] })
    },
  })
}
