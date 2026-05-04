import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Este cliente secundario desactiva la persistencia de sesión.
// Lo usamos ÚNICAMENTE cuando el Dueño crea un Empleado, 
// para evitar que Supabase cierre la sesión actual del Dueño.
export const supabaseAdminAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})
