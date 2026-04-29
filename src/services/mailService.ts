import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'no-reply@lootthread.com';

if (API_KEY) {
  sgMail.setApiKey(API_KEY);
} else {
  console.warn('⚠️ SendGrid API Key not found. Emails will be logged to console in development.');
}

export const sendOrderConfirmation = async (email: string, orderData: any) => {
  const itemsHtml = orderData.items.map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₱${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: `🎮 Acquisition Confirmed: #${orderData._id.toString().slice(-8).toUpperCase()}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #00ffcc; text-transform: uppercase;">Loot Secured!</h1>
        <p>Thanks for your acquisition, Agent.</p>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h2 style="margin-top: 0;">Order Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #eee;">
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold;">Total</td>
                <td style="padding: 12px; text-align: right; font-weight: bold;">₱${orderData.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p style="margin-top: 20px;">You've also earned <strong>${Math.floor(orderData.totalAmount)} XP</strong> towards your next rank!</p>
        <p>View your full dossier at <a href="${process.env.FRONTEND_URL}/account">LootThread HQ</a>.</p>
      </div>
    `,
  };

  try {
    if (API_KEY) {
      await sgMail.send(msg);
      console.log(`✉️ Order confirmation sent to ${email}`);
    } else {
      console.log('--- MOCK EMAIL ---');
      console.log(`To: ${email}`);
      console.log(`Subject: ${msg.subject}`);
      console.log('------------------');
    }
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
};

export const sendOrderStatusUpdate = async (email: string, orderData: any) => {
  const statusColors: any = {
    processing: '#3b82f6',
    completed: '#00ffcc',
    cancelled: '#ef4444'
  };

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: `📦 Status Update: Order #${orderData._id.toString().slice(-8).toUpperCase()}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: ${statusColors[orderData.status] || '#333'}; text-transform: uppercase;">Status: ${orderData.status.toUpperCase()}</h1>
        <p>Your order status has been updated to <strong>${orderData.status}</strong>.</p>
        <p>Log in to your account to see the full details.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">LootThread Tactical Gear Marketplace</p>
      </div>
    `,
  };

  try {
    if (API_KEY) {
      await sgMail.send(msg);
      console.log(`✉️ Status update sent to ${email}`);
    } else {
      console.log('--- MOCK STATUS EMAIL ---');
      console.log(`To: ${email}`);
      console.log(`Status: ${orderData.status}`);
      console.log('-------------------------');
    }
  } catch (error) {
    console.error('❌ Failed to send status update email:', error);
  }
};
