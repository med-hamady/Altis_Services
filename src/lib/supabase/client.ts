import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies dans le fichier .env.local'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Client isolé pour créer des utilisateurs sans affecter la session admin
// persistSession: false empêche le signUp de remplacer la session courante
export const supabaseAuth = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Fonction utilitaire pour obtenir l'URL publique d'un fichier dans le storage
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Fonction utilitaire pour uploader un fichier
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ path: string; error: Error | null }> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    return { path: '', error }
  }

  return { path: data.path, error: null }
}

// Fonction utilitaire pour supprimer un fichier
export async function deleteFile(
  bucket: string,
  paths: string[]
): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage.from(bucket).remove(paths)
  return { error }
}
