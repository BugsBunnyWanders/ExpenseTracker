// Follow the Supabase Edge Function docs to deploy this function
// https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// You'll need to set up environment variables for email sending
// For example, using SendGrid or a similar service

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const APP_URL = Deno.env.get('APP_URL') || 'expensetracker://app'
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'invitations@yourapp.com'

type InvitationPayload = {
  to: string
  invitation_id: string
  group_name: string
  inviter_name: string
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const payload = await req.json() as InvitationPayload
    
    if (!payload || !payload.to || !payload.group_name || !payload.inviter_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a deep link that will open the app to the invitations page
    const inviteUrl = `${APP_URL}/invitations?id=${payload.invitation_id}`
    
    // Create the email content
    const emailContent = {
      to: payload.to,
      from: FROM_EMAIL,
      subject: `${payload.inviter_name} invited you to join ${payload.group_name} on ExpenseTracker`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #5C6BC0; padding: 20px; text-align: center; color: white;">
            <h1>You've Been Invited!</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
            <p>Hello,</p>
            <p><strong>${payload.inviter_name}</strong> has invited you to join <strong>${payload.group_name}</strong> on ExpenseTracker, the easy way to split expenses with friends and family.</p>
            <p>With ExpenseTracker, you can:</p>
            <ul>
              <li>Easily track shared expenses</li>
              <li>Split bills with different people</li>
              <li>Settle up with a single payment</li>
              <li>Keep track of who owes what</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #5C6BC0; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            <p>If you don't have the ExpenseTracker app yet, you can download it from the App Store or Google Play Store and sign up with this email address to see the invitation.</p>
            <p>If you have any questions, simply reply to this email.</p>
            <p>Cheers,<br>The ExpenseTracker Team</p>
          </div>
          <div style="padding: 15px; background-color: #f5f5f5; font-size: 12px; color: #666; text-align: center;">
            <p>This invitation was sent to ${payload.to}. If you didn't expect this invitation, you can ignore this email.</p>
          </div>
        </div>
      `,
    }

    // Send the email using SendGrid API
    if (!SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY not set')
      // For development without SendGrid, just log and return success
      console.log('Would send email:', emailContent)
      return new Response(
        JSON.stringify({ success: true, message: 'Email would be sent (development mode)' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // In production, actually send the email
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify(emailContent),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SendGrid API error: ${response.status} ${errorText}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Invitation email sent successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending invitation email:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send invitation email' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 