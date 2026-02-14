import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, supabaseAuth } from '@/lib/supabase/client'
import type { Admin, Agent, BankUser } from '@/types'

// ============================================================================
// ADMINS
// ============================================================================

export function useAdmins() {
  return useQuery({
    queryKey: ['admins'],
    queryFn: async (): Promise<Admin[]> => {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('full_name')

      if (error) throw error
      return data as Admin[]
    },
  })
}

export function useCreateAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (admin: { email: string; password: string; full_name: string; phone?: string; username?: string }) => {
      // 1. Créer l'utilisateur via signUp (client isolé pour ne pas déconnecter l'admin)
      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email: admin.email,
        password: admin.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Utilisateur non créé')

      // 2. Créer le profil dans admins
      const { data, error } = await supabase
        .from('admins')
        .insert([{
          id: authData.user.id,
          email: admin.email,
          username: admin.username || null,
          full_name: admin.full_name,
          phone: admin.phone || null,
        } as never])
        .select()
        .single()

      if (error) throw error
      return data as Admin
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
    },
  })
}

export function useUpdateAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, admin, password }: { id: string; admin: Partial<Pick<Admin, 'full_name' | 'phone' | 'is_active'>>; password?: string }) => {
      // Mettre à jour le mot de passe si fourni
      if (password) {
        const { error: pwError } = await supabase.rpc('change_user_password' as never, {
          target_user_id: id,
          new_password: password,
        } as never)
        if (pwError) throw pwError
      }

      const { data, error } = await supabase
        .from('admins')
        .update(admin as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Admin
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
    },
  })
}

export function useDeleteAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_auth_user' as never, {
        target_user_id: id,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
    },
  })
}

// ============================================================================
// AGENTS
// ============================================================================

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async (): Promise<Agent[]> => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('full_name')

      if (error) throw error
      return data as Agent[]
    },
  })
}

export function useCreateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (agent: { email: string; password: string; full_name: string; phone?: string; username?: string }) => {
      // 1. Créer l'utilisateur via signUp (client isolé pour ne pas déconnecter l'admin)
      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email: agent.email,
        password: agent.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Utilisateur non créé')

      // 2. Créer le profil agent
      const { data, error } = await supabase
        .from('agents')
        .insert([{
          id: authData.user.id,
          email: agent.email,
          username: agent.username || null,
          full_name: agent.full_name,
          phone: agent.phone || null,
        } as never])
        .select()
        .single()

      if (error) throw error
      return data as Agent
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

export function useUpdateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, agent, password }: { id: string; agent: Partial<Pick<Agent, 'full_name' | 'phone' | 'sector' | 'is_active'>>; password?: string }) => {
      // Mettre à jour le mot de passe si fourni
      if (password) {
        const { error: pwError } = await supabase.rpc('change_user_password' as never, {
          target_user_id: id,
          new_password: password,
        } as never)
        if (pwError) throw pwError
      }

      const { data, error } = await supabase
        .from('agents')
        .update(agent as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Agent
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

export function useDeleteAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_auth_user' as never, {
        target_user_id: id,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

// ============================================================================
// BANK USERS
// ============================================================================

export function useBankUsers() {
  return useQuery({
    queryKey: ['bank_users'],
    queryFn: async (): Promise<BankUser[]> => {
      const { data, error } = await supabase
        .from('bank_users')
        .select('*, bank:banks(*)')
        .order('full_name')

      if (error) throw error
      return data as BankUser[]
    },
  })
}

export function useCreateBankUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (user: { email: string; password: string; full_name: string; phone?: string; bank_id: string; job_title?: string; username?: string }) => {
      // 1. Créer l'utilisateur via signUp (client isolé pour ne pas déconnecter l'admin)
      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email: user.email,
        password: user.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Utilisateur non créé')

      // 2. Créer le profil bank_user
      const { data, error } = await supabase
        .from('bank_users')
        .insert([{
          id: authData.user.id,
          email: user.email,
          username: user.username || null,
          full_name: user.full_name,
          phone: user.phone || null,
          bank_id: user.bank_id,
          job_title: user.job_title || null,
        } as never])
        .select('*, bank:banks(*)')
        .single()

      if (error) throw error
      return data as BankUser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_users'] })
    },
  })
}

export function useUpdateBankUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, user, password }: { id: string; user: Partial<Pick<BankUser, 'full_name' | 'phone' | 'job_title' | 'is_active'>>; password?: string }) => {
      // Mettre à jour le mot de passe si fourni
      if (password) {
        const { error: pwError } = await supabase.rpc('change_user_password' as never, {
          target_user_id: id,
          new_password: password,
        } as never)
        if (pwError) throw pwError
      }

      const { data, error } = await supabase
        .from('bank_users')
        .update(user as never)
        .eq('id', id)
        .select('*, bank:banks(*)')
        .single()

      if (error) throw error
      return data as BankUser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_users'] })
    },
  })
}

export function useDeleteBankUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_auth_user' as never, {
        target_user_id: id,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_users'] })
    },
  })
}
