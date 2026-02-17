import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Import, ImportRow, Case } from '@/types'

// Hook pour récupérer tous les imports
export function useImports() {
  return useQuery({
    queryKey: ['imports'],
    queryFn: async (): Promise<Import[]> => {
      const { data, error } = await supabase
        .rpc('list_imports' as never)

      if (error) throw error
      return (data ?? []) as Import[]
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
        .rpc('get_import' as never, { p_import_id: id } as never)

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
        .rpc('list_import_rows' as never, { p_import_id: importId } as never)

      if (error) throw error
      return (data ?? []) as ImportRow[]
    },
    enabled: !!importId,
  })
}

// Mutation: Upload fichier et créer l'import
export function useCreateImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bankId, file, userId }: { bankId: string; file: File; userId: string }): Promise<Import> => {
      // 1. Create import record via RPC
      const { data: importRecord, error: insertError } = await supabase
        .rpc('create_import' as never, {
          p_bank_id: bankId,
          p_uploaded_by: userId,
          p_file_name: file.name,
        } as never)

      if (insertError) throw insertError

      const typedRecord = importRecord as unknown as { id: string }

      // 2. Upload file to storage (conservé tel quel)
      const filePath = `${bankId}/${typedRecord.id}.xlsx`
      const { error: uploadError } = await supabase.storage
        .from('imports')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        // Cleanup: delete the import record via RPC
        await supabase.rpc('delete_import' as never, { p_import_id: typedRecord.id } as never)
        throw uploadError
      }

      // 3. Update file_path via RPC
      const { data: updated, error: updateError } = await supabase
        .rpc('update_import_file_path' as never, {
          p_import_id: typedRecord.id,
          p_file_path: filePath,
        } as never)

      if (updateError) throw updateError
      return updated as Import
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
    },
  })
}

// Mutation: Lancer le traitement (appel Edge Function — conservé tel quel)
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
        .rpc('toggle_import_row_approval' as never, {
          p_row_id: rowId,
          p_is_approved: isApproved,
        } as never)

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
      const { error } = await supabase
        .rpc('approve_all_valid_rows' as never, { p_import_id: importId } as never)

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
        .rpc('update_import_row' as never, {
          p_row_id: rowId,
          p_proposed_json: proposedJson,
        } as never)

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

      const { data, error } = await supabase
        .rpc('get_cases_by_import' as never, { p_import_id: importId } as never)

      if (error) throw error
      return (data ?? []) as Case[]
    },
    enabled: !!importId && status === 'approved',
  })
}

// Mutation: Finaliser l'import (créer les dossiers — Edge Function conservée)
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
