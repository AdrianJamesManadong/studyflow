// Supabase Edge Function: send-assignment-reminders
//
// Deploy with: supabase functions deploy send-assignment-reminders
// Trigger via Supabase Cron (pg_cron -> pg_net) or an external scheduler,
// once daily, well before end-of-day in your users' timezone.
//
// Required secrets (set via `supabase secrets set`, never in client code):
//   SUPABASE_URL               — provided by default in Edge Functions
//   SUPABASE_SERVICE_ROLE_KEY  — service role key, server-side only
//   RESEND_API_KEY             — Resend API key (you already use Resend for auth email)
//   REMINDER_CRON_SECRET       — a random string only your scheduler knows
//
// Schema assumption: `assignments` has a boolean `reminder_sent` column
// (default false) so a re-run of this function is a no-op for rows already
// handled today. Add it if it doesn't exist yet:
//   alter table assignments add column reminder_sent boolean not null default false;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TIMEZONE = 'Asia/Manila'
const APP_URL = 'https://your-studyflow-url.vercel.app'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Fix: "tomorrow" computed in the app's target timezone, not the server's
// UTC clock — otherwise the cutoff can land on the wrong calendar day
// depending on exactly when the cron fires relative to UTC midnight.
function tomorrowInTimezone(timeZone) {
  const now = new Date()
  const localNow = new Date(now.toLocaleString('en-US', { timeZone }))
  localNow.setDate(localNow.getDate() + 1)
  const y = localNow.getFullYear()
  const m = String(localNow.getMonth() + 1).padStart(2, '0')
  const d = String(localNow.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function sendReminderEmail(email, assignments) {
  const rows = assignments.map(a => `
    <div style="background: #1e1e2e; border-left: 4px solid #6366f1; padding: 16px; border-radius: 8px; margin: 12px 0;">
      <h3 style="color: #fff; margin: 0 0 8px 0;">${escapeHtml(a.title)}</h3>
      <p style="color: #9ca3af; margin: 0;">Due: ${new Date(a.due_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      ${a.due_time ? `<p style="color: #9ca3af; margin: 4px 0 0 0;">Time: ${escapeHtml(a.due_time)}</p>` : ''}
      <p style="color: #f59e0b; margin: 4px 0 0 0; text-transform: capitalize;">Priority: ${escapeHtml(a.priority)}</p>
    </div>
  `).join('')

  const subject = assignments.length === 1
    ? `⏰ Reminder: "${assignments[0].title}" is due tomorrow!`
    : `⏰ Reminder: ${assignments.length} assignments due tomorrow`

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #6366f1;">StudyFlow Reminder 📚</h2>
      <p>Hey! Just a heads up — you have ${assignments.length === 1 ? 'an assignment' : `${assignments.length} assignments`} due tomorrow:</p>
      ${rows}
      <a href="${APP_URL}/dashboard/assignments"
        style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px;">
        View Assignments →
      </a>
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
        You're receiving this because you have an account on StudyFlow.
      </p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'StudyFlow <reminders@your-studyflow-domain.com>',
      to: email,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend error (${res.status}): ${body}`)
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

Deno.serve(async (req) => {
  // Fix: this endpoint sends email to every affected user, so it must not be
  // publicly callable. Require a shared secret the scheduler attaches.
  const providedSecret = req.headers.get('x-cron-secret')
  const expectedSecret = Deno.env.get('REMINDER_CRON_SECRET')
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tomorrowStr = tomorrowInTimezone(TIMEZONE)

  // Fix: only pull assignments not already reminded-about, so a duplicate
  // trigger the same day doesn't re-email anyone.
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('id, title, due_date, due_time, priority, user_id')
    .eq('due_date', tomorrowStr)
    .neq('status', 'done')
    .eq('reminder_sent', false)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!assignments || assignments.length === 0) {
    return new Response(
      JSON.stringify({ message: `No reminders due for ${tomorrowStr}` }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Fix: group by user so someone with several assignments due tomorrow
  // gets one digest email instead of one per assignment.
  const byUser = new Map()
  for (const a of assignments) {
    if (!byUser.has(a.user_id)) byUser.set(a.user_id, [])
    byUser.get(a.user_id).push(a)
  }

  let sent = 0
  let failed = 0
  const sentAssignmentIds = []

  for (const [userId, userAssignments] of byUser) {
    try {
      // Fix: auth.users isn't reachable through a PostgREST join (it's not
      // in the exposed schema) — fetch each user's email via the admin API,
      // which talks to GoTrue directly.
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
      if (userError || !userData?.user?.email) {
        failed += userAssignments.length
        continue
      }

      await sendReminderEmail(userData.user.email, userAssignments)
      sent += userAssignments.length
      sentAssignmentIds.push(...userAssignments.map(a => a.id))
    } catch {
      // Fix: one user's failure (bad email, provider hiccup) no longer
      // aborts the whole run for everyone after them.
      failed += userAssignments.length
    }
  }

  if (sentAssignmentIds.length > 0) {
    await supabase
      .from('assignments')
      .update({ reminder_sent: true })
      .in('id', sentAssignmentIds)
  }

  return new Response(
    JSON.stringify({ message: `Sent ${sent} reminders, ${failed} failed, for ${tomorrowStr}` }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})