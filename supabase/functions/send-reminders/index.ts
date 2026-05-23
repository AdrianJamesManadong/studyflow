import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('*, user:user_id(email)')
    .eq('due_date', tomorrowStr)
    .neq('status', 'done')

  if (error) return new Response(JSON.stringify({ error }), { status: 500 })

  let sent = 0

  for (const a of assignments || []) {
    const email = a.user?.email
    if (!email) continue

    const { error: mailError } = await supabase.auth.admin.sendRawEmail({
      to: email,
      subject: `⏰ Reminder: "${a.title}" is due tomorrow!`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #6366f1;">StudyFlow Reminder 📚</h2>
          <p>Hey! Just a heads up that your assignment is due tomorrow:</p>
          <div style="background: #1e1e2e; border-left: 4px solid #6366f1; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="color: #fff; margin: 0 0 8px 0;">${a.title}</h3>
            <p style="color: #9ca3af; margin: 0;">Due: ${new Date(a.due_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            ${a.due_time ? `<p style="color: #9ca3af; margin: 4px 0 0 0;">Time: ${a.due_time}</p>` : ''}
            <p style="color: #f59e0b; margin: 4px 0 0 0; text-transform: capitalize;">Priority: ${a.priority}</p>
          </div>
          <a href="https://your-studyflow-url.vercel.app/dashboard/assignments"
            style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px;">
            View Assignment →
          </a>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            You're receiving this because you have an account on StudyFlow.
          </p>
        </div>
      `
    })

    if (!mailError) sent++
  }

  return new Response(
    JSON.stringify({ message: `Sent ${sent} reminders for ${tomorrowStr}` }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})