import { Request, Response } from 'express';
import Newsletter from '../models/Newsletter';
import sgMail from '@sendgrid/mail';

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * @desc    Broadcast email to all active subscribers
 * @route   POST /api/newsletter/broadcast
 * @access  Private/Admin
 */
export const broadcastEmail = async (req: Request, res: Response): Promise<any> => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ message: 'Subject and message are required.' });
  }

  try {
    // 1. Fetch all active subscribers
    const subscribers = await Newsletter.find({ isActive: true }).select('email');
    
    if (subscribers.length === 0) {
      return res.status(400).json({ message: 'No active subscribers found.' });
    }

    const recipientEmails = subscribers.map(s => s.email);

    // 2. Prepare SendGrid Message
    // Personalizations allow sending one request while keeping recipient privacy (like BCC)
    // SendGrid limit is 1000 personalizations per request.
    const msg = {
      to: 'noreply@lootthread.clev.studio', // Generic 'To' address
      from: process.env.SENDGRID_FROM_EMAIL || 'LootThread <noreply@lootthread.clev.studio>',
      subject: subject,
      text: message,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #00ffcc; text-transform: uppercase;">LootThread Broadcast</h2>
          <div style="line-height: 1.6; color: #333;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 10px; color: #999;">
            You received this email because you're subscribed to LootThread marketing. 
            Want to stop receiving these? <a href="${process.env.FRONTEND_URL}/unsubscribe" style="color: #00ffcc;">Unsubscribe</a>
          </p>
        </div>
      `,
      // Use BCC to ensure privacy if not using personalizations array specifically for unique values
      bcc: recipientEmails
    };

    // 3. Dispatch via SendGrid
    await sgMail.send(msg);

    res.status(200).json({ 
      message: `Broadcast successfully sent to ${recipientEmails.length} subscribers.`,
      recipientCount: recipientEmails.length 
    });

  } catch (error: any) {
    console.error('SendGrid Error:', error.response?.body || error.message);
    res.status(500).json({ 
      message: 'Failed to dispatch broadcast.',
      error: error.message 
    });
  }
};
