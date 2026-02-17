import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { Admin, Agent, BankUser, UserType } from '@/types'

// Type union pour l'utilisateur courant
export type CurrentUser = (Admin & { userType: 'admin' }) | (Agent & { userType: 'agent' }) | (BankUser & { userType: 'bank_user' })

interface AuthContextType {
  user: User | null
  currentUser: CurrentUser | null
  userType: UserType | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [userType, setUserType] = useState<UserType | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Charger le profil utilisateur via RPC
  const fetchUserProfile = useCallback(async (userId: string): Promise<CurrentUser | null> => {
    const { data, error } = await supabase
      .rpc('get_user_profile' as never, { p_user_id: userId } as never)

    if (error) {
      console.error('Erreur get_user_profile:', error)
      return null
    }

    if (!data) {
      console.error('Aucun profil trouvé pour userId:', userId)
      return null
    }

    const result = data as { userType: string; profile: Record<string, unknown> }
    const profile = result.profile
    const userType = result.userType as 'admin' | 'agent' | 'bank_user'

    if (!(profile as { is_active: boolean }).is_active) {
      const labels = { admin: 'administrateur', agent: 'agent', bank_user: 'utilisateur banque' }
      throw new Error(`Ce compte ${labels[userType]} a été désactivé`)
    }

    return { ...profile, userType } as CurrentUser
  }, [])

  // Initialiser l'authentification
  useEffect(() => {
    // Récupérer la session initiale
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (initialSession?.user) {
        setSession(initialSession)
        setUser(initialSession.user)

        try {
          const profile = await fetchUserProfile(initialSession.user.id)
          if (profile) {
            setCurrentUser(profile)
            setUserType(profile.userType)
          } else {
            // Profil non trouvé, déconnecter
            await supabase.auth.signOut()
            setUser(null)
            setSession(null)
          }
        } catch (error) {
          console.error('Erreur profil initial:', error)
          await supabase.auth.signOut()
          setUser(null)
          setSession(null)
        }
      }

      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Écouter les changements (pour déconnexion)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, _newSession) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setCurrentUser(null)
        setUserType(null)
        setSession(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  // Connexion
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      if (!data.user) {
        return { error: new Error('Connexion échouée') }
      }

      // Charger le profil
      const profile = await fetchUserProfile(data.user.id)

      if (!profile) {
        await supabase.auth.signOut()
        return { error: new Error('Profil utilisateur introuvable. Contactez l\'administrateur.') }
      }

      setUser(data.user)
      setSession(data.session)
      setCurrentUser(profile)
      setUserType(profile.userType)
      setLoading(false)

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Déconnexion
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCurrentUser(null)
    setUserType(null)
    setSession(null)
  }

  // Réinitialisation du mot de passe
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return { error: error || null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Mise à jour du mot de passe
  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      return { error: error || null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const value: AuthContextType = {
    user,
    currentUser,
    userType,
    session,
    loading,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }

  return context
}

// Hook utilitaire pour les permissions
export function usePermissions() {
  const { userType, currentUser } = useAuth()

  return {
    isAdmin: userType === 'admin',
    isAgent: userType === 'agent',
    isBankUser: userType === 'bank_user',
    userType,

    // Informations utilisateur
    userId: currentUser?.id,
    userName: currentUser?.full_name,
    userEmail: currentUser?.email,

    // Informations spécifiques
    bankId: userType === 'bank_user' ? (currentUser as BankUser & { userType: 'bank_user' }).bank_id : null,

    // Permissions spécifiques
    canManageBanks: userType === 'admin',
    canManageUsers: userType === 'admin',
    canCreateCase: userType === 'admin' || userType === 'bank_user',
    canAssignCase: userType === 'admin',
    canCloseCase: userType === 'admin',
    canValidatePayment: userType === 'admin',
    canDeclarePayment: userType === 'agent' || userType === 'admin',
    canCreateAction: userType === 'agent' || userType === 'admin',
    canCreatePromise: userType === 'agent' || userType === 'admin',
    canUploadDocument: userType === 'agent' || userType === 'admin',
    canViewAuditLogs: userType === 'admin',
    canExportData: userType === 'admin' || userType === 'bank_user',

    // Permissions de lecture
    canViewAllCases: userType === 'admin',
    canViewAssignedCasesOnly: userType === 'agent',
    canViewBankCasesOnly: userType === 'bank_user',
  }
}
