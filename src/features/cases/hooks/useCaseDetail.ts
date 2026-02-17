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
        .rpc('get_case_detail' as never, { p_case_id: id! } as never)

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
        .rpc('assign_agent' as never, {
          p_case_id: caseId,
          p_agent_id: agentId,
        } as never)

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
        .rpc('update_case' as never, {
          p_case_id: id,
          p_data: updates,
        } as never)

      if (error) throw error
      return data as Case
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases', (data as Case).id] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

export function useCaseActions(caseId: string | undefined) {
  return useQuery({
    queryKey: ['cases', caseId, 'actions'],
    queryFn: async (): Promise<Action[]> => {
      const { data, error } = await supabase
        .rpc('list_case_actions' as never, { p_case_id: caseId! } as never)

      if (error) throw error
      return (data ?? []) as Action[]
    },
    enabled: !!caseId,
  })
}

export function useCasePromises(caseId: string | undefined) {
  return useQuery({
    queryKey: ['cases', caseId, 'promises'],
    queryFn: async (): Promise<CasePromise[]> => {
      const { data, error } = await supabase
        .rpc('list_case_promises' as never, { p_case_id: caseId! } as never)

      if (error) throw error
      return (data ?? []) as CasePromise[]
    },
    enabled: !!caseId,
  })
}

export function useCasePayments(caseId: string | undefined) {
  return useQuery({
    queryKey: ['cases', caseId, 'payments'],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .rpc('list_case_payments' as never, { p_case_id: caseId! } as never)

      if (error) throw error
      return (data ?? []) as Payment[]
    },
    enabled: !!caseId,
  })
}

export function useCaseDocuments(caseId: string | undefined) {
  return useQuery({
    queryKey: ['cases', caseId, 'documents'],
    queryFn: async (): Promise<Document[]> => {
      const { data, error } = await supabase
        .rpc('list_case_documents' as never, { p_case_id: caseId! } as never)

      if (error) throw error
      return (data ?? []) as Document[]
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
        .rpc('create_action' as never, {
          p_case_id: input.case_id,
          p_action_type: input.action_type,
          p_action_date: input.action_date,
          p_result: input.result,
          p_notes: input.notes || null,
          p_next_action_type: input.next_action_type || null,
          p_next_action_date: input.next_action_date || null,
          p_next_action_notes: input.next_action_notes || null,
        } as never)

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
      const { data, error } = await supabase
        .rpc('create_promise' as never, {
          p_case_id: input.case_id,
          p_amount: input.amount,
          p_due_date: input.due_date,
          p_payment_method: input.payment_method || null,
          p_reference: input.reference || null,
          p_notes: input.notes || null,
        } as never)

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
      const { data, error } = await supabase
        .rpc('update_promise_status' as never, {
          p_promise_id: input.promise_id,
          p_status: input.status,
          p_status_notes: input.status_notes || null,
          p_new_due_date: input.new_due_date || null,
        } as never)

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
        .rpc('delete_promise' as never, { p_promise_id: promise_id } as never)

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
      const { isAdmin, ...paymentData } = input

      const { data, error } = await supabase
        .rpc('create_payment' as never, {
          p_case_id: paymentData.case_id,
          p_amount: paymentData.amount,
          p_payment_date: paymentData.payment_date,
          p_payment_method: paymentData.payment_method || null,
          p_transaction_reference: paymentData.transaction_reference || null,
          p_receipt_path: paymentData.receipt_path || null,
          p_is_admin: isAdmin || false,
        } as never)

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
      const { data, error } = await supabase
        .rpc('validate_payment' as never, {
          p_payment_id: input.payment_id,
          p_approved: input.approved,
          p_rejection_reason: input.rejection_reason || null,
        } as never)

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
        .rpc('get_case_extra_info' as never, { p_case_id: caseId! } as never)

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
        .rpc('create_case_extra_info' as never, {
          p_case_id: input.case_id,
          p_label: input.label,
          p_value: input.value,
        } as never)

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
        .rpc('delete_case_extra_info' as never, { p_id: id } as never)

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.case_id, 'extra_info'] })
    },
  })
}
