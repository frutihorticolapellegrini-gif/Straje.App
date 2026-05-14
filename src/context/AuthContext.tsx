import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

interface EmpresaProfile {
  id: string
  nombre: string
  plan: 'programador' | 'premium' | 'estandar'
  fecha_registro: string
  fecha_fin_prueba: string | null
  telefono?: string
  direccion?: string
  localidad?: string
  logo_url?: string
  activa: boolean
}

interface UserProfile {
  id: string
  empresa_id: string
  rol: 'dueño' | 'empleado' | 'programador'
  nombre: string
  email?: string
  permisos?: {
    puede_ver_historial?: boolean
    puede_cargar_stock?: boolean
    puede_cancelar_ventas?: boolean
    puede_ver_inventario?: boolean
    [key: string]: any // Permite claves dinámicas para módulos
  }
  activo: boolean
}

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  empresa: EmpresaProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  empresa: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [empresa, setEmpresa] = useState<EmpresaProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await fetchProfileAndCompany(session.user.id)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfileAndCompany(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfileAndCompany(session.user.id)
      } else {
        setProfile(null)
        setEmpresa(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfileAndCompany = async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) throw userError
      
      const { data: { user } } = await supabase.auth.getUser()
      const userProfile = { ...userData, email: user?.email } as UserProfile
      
      if (userProfile.activo === false) {
        await supabase.auth.signOut()
        setProfile(null)
        setEmpresa(null)
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }

      setProfile(userProfile)

      const { data: empData, error: empError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', userProfile.empresa_id)
        .single()

      if (empError) throw empError
      
      setEmpresa(empData as EmpresaProfile)

    } catch (error) {
      console.error('Error fetching auth data:', error)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, empresa, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
