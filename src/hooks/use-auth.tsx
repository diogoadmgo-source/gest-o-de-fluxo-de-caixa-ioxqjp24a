import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { UserProfile } from '@/lib/types'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  allowedCompanyIds: string[]
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: any; requires2FA?: boolean }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (password: string) => Promise<{ error: any }>
  updateProfile: (data: {
    name: string
    email: string
    is_2fa_enabled: boolean
  }) => Promise<{ error: any; emailMessage?: string }>
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [allowedCompanyIds, setAllowedCompanyIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      // Fetch user companies
      const { data: companiesData } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', userId)

      const companyIds = companiesData?.map((c) => c.company_id) || []
      setAllowedCompanyIds(companyIds)

      return data as UserProfile
    } catch (err) {
      console.error('Exception fetching profile:', err)
      return null
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).then((profile) => {
          if (profile) {
            if (profile.status === 'Blocked' || profile.status === 'Inactive') {
              supabase.auth.signOut()
              toast.error(
                'Acesso temporariamente indisponível. Tente novamente mais tarde.',
              )
              setUserProfile(null)
            } else {
              setUserProfile(profile)
            }
          }
        })
      } else {
        setUserProfile(null)
        setAllowedCompanyIds([])
      }
      setLoading(false)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).then((profile) => {
          setUserProfile(profile)
        })
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id)
        if (
          profile &&
          (profile.status === 'Blocked' || profile.status === 'Inactive')
        ) {
          await supabase.auth.signOut()
          return {
            error: {
              message:
                'Acesso temporariamente indisponível. Tente novamente mais tarde.',
            },
          }
        }

        // Check for 2FA requirement
        if (profile?.is_2fa_enabled) {
          return { error: null, requires2FA: true }
        }

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({ last_access: new Date().toISOString() })
            .eq('id', data.user.id)

          await supabase.from('audit_logs').insert({
            action: 'Login',
            entity: 'Auth',
            user_id: data.user.id,
            details: { method: 'password' },
          })
        }
      }

      return { error: null }
    } catch (e: any) {
      return { error: e }
    }
  }

  const signOut = async () => {
    if (user) {
      await supabase.from('audit_logs').insert({
        action: 'Logout',
        entity: 'Auth',
        user_id: user.id,
      })
    }
    const { error } = await supabase.auth.signOut()
    setUserProfile(null)
    return { error }
  }

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error && user) {
      if (userProfile?.status === 'Pending') {
        await supabase
          .from('user_profiles')
          .update({ status: 'Active' })
          .eq('id', user.id)

        refreshProfile()
      }

      await supabase.from('audit_logs').insert({
        action: 'Password Update',
        entity: 'Auth',
        user_id: user.id,
      })
    }
    return { error }
  }

  const updateProfile = async (data: {
    name: string
    email: string
    is_2fa_enabled: boolean
  }) => {
    if (!user) return { error: { message: 'No user logged in' } }

    let emailMessage = ''

    // 1. Update Email in Auth (if changed)
    if (data.email !== user.email) {
      const { data: authData, error: authError } =
        await supabase.auth.updateUser({
          email: data.email,
        })

      if (authError) {
        return { error: authError }
      }

      emailMessage =
        'E-mail atualizado. Verifique sua caixa de entrada para confirmar a alteração, se necessário.'
    }

    // 2. Update Profile Table (Name & 2FA)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        name: data.name,
        is_2fa_enabled: data.is_2fa_enabled,
      })
      .eq('id', user.id)

    if (profileError) {
      return { error: profileError }
    }

    await refreshProfile()
    return { error: null, emailMessage }
  }

  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchProfile(user.id)
      setUserProfile(profile)
    }
  }

  const value = {
    user,
    session,
    userProfile,
    allowedCompanyIds,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    loading,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
