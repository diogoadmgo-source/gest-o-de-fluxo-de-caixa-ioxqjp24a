import { supabase } from '@/lib/supabase/client'
import { Notification, NotificationSettings } from '@/lib/types'

export const getNotificationSettings = async (companyId: string) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) throw new Error('User not found')

  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('company_id', companyId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is no rows returned, which is fine, we return null
    throw error
  }

  return data as NotificationSettings | null
}

export const updateNotificationSettings = async (
  companyId: string,
  settings: Partial<NotificationSettings>,
) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) throw new Error('User not found')

  // Check if exists
  const existing = await getNotificationSettings(companyId)

  if (existing) {
    const { data, error } = await supabase
      .from('notification_settings')
      .update(settings)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('notification_settings')
      .insert({
        user_id: user.user.id,
        company_id: companyId,
        days_before_due: settings.days_before_due || 3,
        email_enabled: settings.email_enabled ?? true,
        app_enabled: settings.app_enabled ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export const fetchNotifications = async (limit = 20) => {
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as Notification[]
}

export const fetchUnreadNotificationsCount = async () => {
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.user.id)
    .eq('is_read', false)

  if (error) throw error
  return count || 0
}

export const markNotificationRead = async (id: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw error
}

export const markAllNotificationsRead = async () => {
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.user.id)
    .eq('is_read', false)
  if (error) throw error
}
