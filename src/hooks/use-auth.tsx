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
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (password: string) => Promise<{ error: any }>
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
      return data as UserProfile
    } catch (err) {
      console.error('Exception fetching profile:', err)
      return null
    }
  }

  const logAudit = async (action: string, details?: any) => {
    if (!user) return
    try {
      await supabase.from('audit_logs').insert({
        action,
        entity: 'Auth',
        user_id: user.id,
        details,
      })
    } catch (e) {
      // ignore log errors
    }
  }

  useEffect(() => {
    // Set up auth state listener FIRST
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
              // Update last access if needed, but maybe not on every state change to avoid spam
            }
          }
        })
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).then((profile) => {
          if (profile) {
            if (profile.status === 'Blocked' || profile.status === 'Inactive') {
              supabase.auth.signOut()
            } else {
              setUserProfile(profile)
            }
          }
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

      // Check profile status immediately after login
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

        // Log access
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
      // If profile was pending, activate it
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
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    loading,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
