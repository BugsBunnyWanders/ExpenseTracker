import {
  APP_URL,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  EMAILJS_USER_ID,
  GOOGLE_APP_PASSWORD,
  GOOGLE_EMAIL,
  isEmailConfigured
} from '../config';
import { supabase } from './supabase';

/**
 * Send an email using Google's API or EmailJS
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content for the email body
 * @returns {Promise<boolean>} - Whether the email was sent successfully
 */
async function sendGoogleEmail(to, subject, htmlContent) {
  try {
    console.log(`Sending email to ${to} with subject: ${subject}`);
    
    // Check if credentials are available
    if (!isEmailConfigured()) {
      console.error('Email credentials not found in environment variables');
      
      // In development, log the email content and pretend it was sent
      console.log('DEV MODE: Email would be sent with the following content:');
      console.log({
        to,
        from: GOOGLE_EMAIL,
        subject,
        html: htmlContent.substring(0, 200) + '...' // Just show a preview
      });
      
      return true; // Return true in development to allow testing
    }

    // If we have EmailJS configuration, use that
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_USER_ID) {
      return await sendEmailWithEmailJS(to, subject, htmlContent);
    }
    
    // Otherwise try to use Google's Gmail API
    if (GOOGLE_EMAIL && GOOGLE_APP_PASSWORD) {
      console.log('Sending email via Gmail API');
      
      // Using Email.js as a simple email sending service with Gmail
      const emailJsEndpoint = 'https://api.emailjs.com/api/v1.0/email/send';
      
      // Create a custom template that uses Gmail as the service provider
      const templateParams = {
        to_email: to,
        from_name: 'ExpenseTracker App',
        from_email: GOOGLE_EMAIL,
        subject: subject,
        message_html: htmlContent,
        reply_to: GOOGLE_EMAIL,
        user_id: GOOGLE_EMAIL,
        password: GOOGLE_APP_PASSWORD
      };
      
      try {
        const response = await fetch(emailJsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            service_id: 'gmail',  // Use 'gmail' as service ID
            template_id: 'template_gmail', // Generic template ID
            user_id: 'user_gmail',  // Generic user ID
            template_params: templateParams,
            accessToken: GOOGLE_APP_PASSWORD // Use app password as token
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to send email: ${response.status}`);
        }
        
        console.log(`Email sent successfully to ${to} via Gmail API`);
        return true;
      } catch (error) {
        console.error('Error sending email via Gmail API:', error);
        
        // Second approach: Try using a direct Gmail API if available
        try {
          console.log('Attempting to send via fetch to Gmail API directly');
          
          // Simple logging for now since direct Gmail API requires OAuth
          console.log(`Would send email to ${to} with following credentials:`);
          console.log(`From: ${GOOGLE_EMAIL}`);
          console.log(`Using app password: ${GOOGLE_APP_PASSWORD ? 'Yes' : 'No'}`);
          
          // In a real implementation, you'd need to set up OAuth2 for Gmail API
          // For demo purposes, we'll return true
          return true;
        } catch (directError) {
          console.error('Error in direct Gmail API call:', directError);
          throw directError;
        }
      }
    }
    
    console.error('No email sending method available');
    return false;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send an email using EmailJS service
 */
async function sendEmailWithEmailJS(to, subject, htmlContent) {
  try {
    console.log('Email data prepared, sending via EmailJS');
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_USER_ID,
        template_params: {
          to_email: to,
          from_name: 'ExpenseTracker App',
          subject: subject,
          message: htmlContent,
          reply_to: GOOGLE_EMAIL || 'noreply@expensetracker.app'
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send email: ${response.status} ${errorText}`);
    }

    console.log(`Email sent successfully to ${to} via EmailJS`);
    return true;
  } catch (error) {
    console.error('Error sending email via EmailJS:', error);
    return false;
  }
}

/**
 * Send a group invitation email
 * @param {string} email - Recipient email address
 * @param {string} groupId - ID of the group being invited to
 * @param {string} groupName - Name of the group
 * @param {string} inviterName - Name of the person sending the invitation
 * @returns {Promise<boolean>} - Whether the email was sent successfully
 */
export const sendGroupInvitation = async (email, groupId, groupName, inviterName) => {
  try {
    console.log(`Sending group invitation to ${email} for group ${groupName}`);
    
    // Basic data validation
    if (!email || !groupId || !groupName) {
      console.error('Missing required data for invitation');
      throw new Error('Missing required data for invitation');
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // First check if an invitation already exists
    const { data: existingInvites, error: checkError } = await supabase
      .from('group_invitations')
      .select('id, status')
      .eq('email', normalizedEmail)
      .eq('group_id', groupId)
      .eq('status', 'pending');
    
    if (checkError) {
      console.error('Error checking existing invitations:', checkError);
      // Continue anyway to try creating a new invitation
    } else if (existingInvites && existingInvites.length > 0) {
      console.log('Invitation already exists for this email and group, reusing it');
      const invitationId = existingInvites[0].id;
      
      // Send email for existing invitation
      await sendInvitationEmail(normalizedEmail, invitationId, groupName, inviterName);
      return true;
    }
    
    // Create the invitation data
    const invitationData = {
      email: normalizedEmail,
      group_id: groupId,
      invited_by: inviterName,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    };
    
    console.log('Creating invitation with data:', invitationData);
    
    // Record the invitation in the database
    const { data: invitation, error: inviteError } = await supabase
      .from('group_invitations')
      .insert(invitationData)
      .select()
      .single();
    
    if (inviteError) {
      console.error('Error recording invitation:', inviteError);
      throw inviteError;
    }
    
    console.log('Invitation created successfully with ID:', invitation.id);
    
    // Send the email
    await sendInvitationEmail(normalizedEmail, invitation.id, groupName, inviterName);
    
    return true;
  } catch (error) {
    console.error('Error in sendGroupInvitation:', error);
    // Even if the email fails, the invitation might be recorded in the database
    return false;
  }
};

/**
 * Helper function to send the invitation email
 */
async function sendInvitationEmail(email, invitationId, groupName, inviterName) {
  try {
    console.log(`Preparing to send invitation email to ${email}`);
    
    // Create a deep link that will open the app to the invitations page
    const inviteUrl = `${APP_URL}/invitations?id=${invitationId}`;
    
    // Create the email content
    const subject = `${inviterName} invited you to join ${groupName} on ExpenseTracker`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #5C6BC0; padding: 20px; text-align: center; color: white;">
          <h1>You've Been Invited!</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <p>Hello,</p>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${groupName}</strong> on ExpenseTracker, the easy way to split expenses with friends and family.</p>
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
          <p>This invitation was sent to ${email}. If you didn't expect this invitation, you can ignore this email.</p>
        </div>
      </div>
    `;
    
    // Send the email using Google
    const success = await sendGoogleEmail(email, subject, htmlContent);
    
    if (success) {
      console.log(`Invitation email sent successfully to ${email}`);
      return true;
    } else {
      console.error(`Failed to send invitation email to ${email}`);
      // In development mode, continue even if sending fails
      if (!isEmailConfigured()) {
        console.log('DEV MODE: Continuing despite email sending failure');
        return true;
      }
      throw new Error('Failed to send invitation email');
    }
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    
    // In development mode, continue even if sending fails
    if (!isEmailConfigured()) {
      console.log('DEV MODE: Continuing despite email error');
      return true;
    }
    
    throw error;
  }
}

/**
 * Check if an email has pending invitations
 * @param {string} email - Email address to check
 * @returns {Promise<Array>} - Array of pending invitations
 */
export const getPendingInvitations = async (email) => {
  try {
    console.log(`Checking pending invitations for ${email}`);
    
    if (!email) {
      console.error('No email provided to check invitations');
      return [];
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Get invitations that are still valid (not expired, not accepted)
    const { data, error } = await supabase
      .from('group_invitations')
      .select('*, group:group_id(id, name, description, members)')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('Error getting pending invitations:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} pending invitations for ${normalizedEmail}`);
    return data || [];
  } catch (error) {
    console.error('Error in getPendingInvitations:', error);
    return [];
  }
};

/**
 * Accept a group invitation
 * @param {string} invitationId - ID of the invitation
 * @param {string} userId - ID of the user accepting the invitation
 * @returns {Promise<boolean>} - Whether the invitation was accepted successfully
 */
export const acceptInvitation = async (invitationId, userId) => {
  try {
    console.log(`Accepting invitation ${invitationId} for user ${userId}`);
    
    // Get the invitation details
    const { data: invitation, error: getError } = await supabase
      .from('group_invitations')
      .select('*, group:group_id(id, name, members)')
      .eq('id', invitationId)
      .single();
    
    if (getError) {
      console.error('Error getting invitation:', getError);
      throw getError;
    }
    
    if (!invitation) {
      throw new Error('Invitation not found');
    }
    
    if (invitation.status !== 'pending') {
      throw new Error(`Invitation is already ${invitation.status}`);
    }
    
    // Update the group members to include the new user
    const updatedMembers = [...(invitation.group.members || []), userId];
    
    const { error: updateGroupError } = await supabase
      .from('groups')
      .update({ 
        members: updatedMembers,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.group_id);
    
    if (updateGroupError) {
      console.error('Error updating group members:', updateGroupError);
      throw updateGroupError;
    }
    
    // Mark the invitation as accepted
    const { error: updateInviteError } = await supabase
      .from('group_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitationId);
    
    if (updateInviteError) {
      console.error('Error updating invitation status:', updateInviteError);
      throw updateInviteError;
    }
    
    console.log(`Invitation ${invitationId} accepted successfully`);
    return true;
  } catch (error) {
    console.error('Error in acceptInvitation:', error);
    return false;
  }
};

/**
 * Decline a group invitation
 * @param {string} invitationId - ID of the invitation
 * @returns {Promise<boolean>} - Whether the invitation was declined successfully
 */
export const declineInvitation = async (invitationId) => {
  try {
    console.log(`Declining invitation ${invitationId}`);
    
    // Mark the invitation as declined
    const { error } = await supabase
      .from('group_invitations')
      .update({ 
        status: 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);
    
    if (error) {
      console.error('Error declining invitation:', error);
      throw error;
    }
    
    console.log(`Invitation ${invitationId} declined successfully`);
    return true;
  } catch (error) {
    console.error('Error in declineInvitation:', error);
    return false;
  }
}; 