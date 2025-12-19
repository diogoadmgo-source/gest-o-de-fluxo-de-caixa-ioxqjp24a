import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  // Cron authorization verification could go here if exposed publicly
  // For now assuming internal cron execution

  try {
    console.log('Starting check-due-payables...')

    // 1. Get all notification settings where app_enabled or email_enabled is true
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select(
        'user_id, company_id, days_before_due, app_enabled, email_enabled',
      )
      .or('app_enabled.eq.true,email_enabled.eq.true')

    if (settingsError) throw settingsError

    if (!settings || settings.length === 0) {
      console.log('No active notification settings found.')
      return new Response(JSON.stringify({ message: 'No settings' }), {
        status: 200,
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const notificationsToCreate: any[] = []
    const emailsToSend: any[] = [] // Placeholder for email logic

    // 2. Iterate settings and find matching payables
    for (const setting of settings) {
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() + setting.days_before_due)
      const targetDateStr = targetDate.toISOString().split('T')[0]

      // Find payables due on targetDate for this company
      const { data: payables, error: payablesError } = await supabase
        .from('transactions')
        .select('id, document_number, entity_name, amount')
        .eq('company_id', setting.company_id)
        .eq('type', 'payable')
        .eq('status', 'pending')
        .eq('due_date', targetDateStr)

      if (payablesError) {
        console.error(
          `Error fetching payables for company ${setting.company_id}:`,
          payablesError,
        )
        continue
      }

      if (payables && payables.length > 0) {
        const count = payables.length
        const totalAmount = payables.reduce(
          (acc: number, curr: any) => acc + (curr.amount || 0),
          0,
        )

        // Construct message
        const title = `Contas a vencer em ${setting.days_before_due} dias`
        const message = `Você tem ${count} contas vencendo dia ${targetDate.toLocaleDateString('pt-BR')} totalizando ${totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`

        if (setting.app_enabled) {
          notificationsToCreate.push({
            user_id: setting.user_id,
            company_id: setting.company_id,
            title,
            message,
            is_read: false,
          })
        }

        if (setting.email_enabled) {
          emailsToSend.push({
            user_id: setting.user_id,
            subject: title,
            body: message,
          })
        }
      }
    }

    // 3. Insert Notifications
    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate)

      if (insertError) throw insertError
    }

    // 4. Send Emails (Mock)
    if (emailsToSend.length > 0) {
      console.log(`Sending ${emailsToSend.length} emails (Mock)...`)
      // Integration with Resend or SendGrid would go here
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notificationsToCreate.length,
        emailsQueued: emailsToSend.length,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('Error executing check-due-payables:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    })
  }
})
