import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Import, ImportRow, Case } from '@/types'

// Hook pour récupérer tous les imports
export function useImports() {
  return useQuery({
    queryKey: ['imports'],
    queryFn: async (): Promise<Import[]> => {
      const { data, error } = await supabase
        .from('imports')
        .select('*, bank:banks(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Import[]
    },
  })
}

// Hook pour récupérer un import par ID
export function useImport(id: string | null) {
  return useQuery({
    queryKey: ['imports', id],
    queryFn: async (): Promise<Import | null> => {
      if (!id) return null

      const { data, error } = await supabase
        .from('imports')
        .select('*, bank:banks(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Import
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as Import | null | undefined
      // Polling while processing
      if (data?.status === 'processing' || data?.status === 'uploaded') {
        return 3000
      }
      return false
    },
  })
}

// Hook pour récupérer les lignes d'un import
export function useImportRows(importId: string | null) {
  return useQuery({
    queryKey: ['import-rows', importId],
    queryFn: async (): Promise<ImportRow[]> => {
      if (!importId) return []

      const { data, error } = await supabase
        .from('import_rows')
        .select('*')
        .eq('import_id', importId)
        .order('row_number')

      if (error) throw error
      return data as ImportRow[]
    },
    enabled: !!importId,
  })
}

// Mutation: Upload fichier et créer l'import
export function useCreateImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bankId, file, userId }: { bankId: string; file: File; userId: string }): Promise<Import> => {
      // 1. Create import record
      const { data: importRecord, error: insertError } = await supabase
        .from('imports')
        .insert({
          bank_id: bankId,
          uploaded_by: userId,
          file_path: '', // Will be updated after upload
          file_name: file.name,
          status: 'uploaded',
        } as never)
        .select()
        .single()

      if (insertError) throw insertError

      const typedRecord = importRecord as unknown as { id: string }

      // 2. Upload file to storage
      const filePath = `${bankId}/${typedRecord.id}.xlsx`
      const { error: uploadError } = await supabase.storage
        .from('imports')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        // Cleanup: delete the import record
        await supabase.from('imports').delete().eq('id', typedRecord.id)
        throw uploadError
      }

      // 3. Update file_path
      const { data: updated, error: updateError } = await supabase
        .from('imports')
        .update({ file_path: filePath } as never)
        .eq('id', typedRecord.id)
        .select('*, bank:banks(*)')
        .single()

      if (updateError) throw updateError
      return updated as Import
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
    },
  })
}

// Mutation: Lancer le traitement (appel Edge Function)
export function useProcessImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (importId: string) => {
      const { data, error } = await supabase.functions.invoke('process-import', {
        body: { import_id: importId },
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, importId) => {
      queryClient.invalidateQueries({ queryKey: ['imports', importId] })
      queryClient.invalidateQueries({ queryKey: ['imports'] })
      queryClient.invalidateQueries({ queryKey: ['import-rows', importId] })
    },
  })
}

// Mutation: Approuver/désapprouver une ligne
export function useToggleRowApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rowId, isApproved }: { rowId: string; isApproved: boolean }) => {
      const { error } = await supabase
        .from('import_rows')
        .update({ is_approved: isApproved } as never)
        .eq('id', rowId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-rows'] })
    },
  })
}

// Mutation: Approuver toutes les lignes valides
export function useApproveAllValidRows() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (importId: string) => {
      // Approve rows with no errors
      const { data: rows } = await supabase
        .from('import_rows')
        .select('id, errors')
        .eq('import_id', importId)

      if (!rows) return

      const typedRows = rows as unknown as { id: string; errors: unknown[] | null }[]
      const validIds = typedRows
        .filter((r) => !r.errors || r.errors.length === 0)
        .map((r) => r.id)

      if (validIds.length === 0) return

      const { error } = await supabase
        .from('import_rows')
        .update({ is_approved: true } as never)
        .in('id', validIds)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-rows'] })
    },
  })
}

// Mutation: Mettre à jour proposed_json d'une ligne (édition inline)
export function useUpdateImportRow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rowId, proposedJson }: { rowId: string; proposedJson: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('import_rows')
        .update({ proposed_json: proposedJson } as never)
        .eq('id', rowId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-rows'] })
    },
  })
}

// Hook: Récupérer les dossiers créés à partir d'un import (via audit_logs)
export function useCasesByImport(importId: string | null, status: string | undefined) {
  return useQuery({
    queryKey: ['cases-by-import', importId],
    queryFn: async (): Promise<Case[]> => {
      if (!importId) return []

      // 1. Trouver les IDs des cases créés via audit_logs
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('record_id')
        .eq('table_name', 'cases')
        .eq('operation', 'INSERT')
        .contains('new_data', { source: 'import', import_id: importId })

      if (logsError || !logs || logs.length === 0) return []

      const typedLogs = logs as unknown as { record_id: string }[]
      const caseIds = typedLogs.map((l) => l.record_id)

      // 2. Charger les cases avec les relations
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('*, bank:banks(id, name), debtor_pp:debtors_pp(id, first_name, last_name), debtor_pm:debtors_pm(id, company_name)')
        .in('id', caseIds)
        .order('created_at', { ascending: true })

      if (casesError) throw casesError
      return (cases || []) as Case[]
    },
    enabled: !!importId && status === 'approved',
  })
}

// Mutation: Finaliser l'import (créer les dossiers)
export function useFinalizeImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ importId, approvedRowIds }: { importId: string; approvedRowIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke('finalize-import', {
        body: { import_id: importId, approved_row_ids: approvedRowIds },
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}
