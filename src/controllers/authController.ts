import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import sgMail from '@sendgrid/mail';

// ---------------------------------------------------------------------------
// Helper: sign a JWT
// ---------------------------------------------------------------------------
const signToken = (id: string, role: string): string =>
  jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '30d') as any,
  });

// ---------------------------------------------------------------------------
// @desc    Register a new customer
// @route   POST /api/auth/register
// @access  Public
// ---------------------------------------------------------------------------
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    const user = await User.create({ name, email, password, role: 'customer' });
    const token = signToken((user._id as any).toString(), user.role);

    res.status(201).json({
      user: {
        id:    (user._id as any).toString(),
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Login user & return JWT
// @route   POST /api/auth/login
// @access  Public
// ---------------------------------------------------------------------------
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact support.' });
    }

    const token = signToken((user._id as any).toString(), user.role);

    res.json({
      user: {
        id:    (user._id as any).toString(),
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Forgot Password (generate OTP & send via SendGrid)
// @route   POST /api/auth/forgot-password
// @access  Public
// ---------------------------------------------------------------------------
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Return 200 to prevent email enumeration
      return res.status(200).json({ message: 'If an account with that email exists, an OTP was sent.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiry (15 mins)
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // ── SendGrid Dispatch ──────────────────────────────────────────────────
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL as string,
        subject: 'Your LootThread OTP Code',
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>LootThread OTP</title>
          </head>
          <body style="margin:0;padding:0;background-color:#0a0a12;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a12;padding:40px 0;">
              <tr>
                <td align="center">
                  <table width="480" cellpadding="0" cellspacing="0" style="background-color:#111120;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#00ffcc10,#7c3aed10);padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.06);">
                        <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;text-transform:uppercase;font-style:italic;">
                          Loot<span style="color:#00ffcc;">Thread</span>
                        </p>
                        <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.15em;text-transform:uppercase;">Security Verification</p>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:40px;">
                        <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 24px;">
                          We received a request to reset the password for your LootThread account. Use the code below — it expires in <strong style="color:#ffffff;">15 minutes</strong>.
                        </p>
                        <!-- OTP Box -->
                        <div style="background-color:rgba(0,255,204,0.06);border:1px solid rgba(0,255,204,0.2);border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
                          <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.2em;text-transform:uppercase;">Your One-Time Passcode</p>
                          <p style="margin:0;font-size:48px;font-weight:900;letter-spacing:12px;color:#00ffcc;font-family:'Courier New',monospace;">${otp}</p>
                        </div>
                        <p style="color:rgba(255,255,255,0.35);font-size:12px;line-height:1.6;margin:0;">
                          If you did not request a password reset, you can safely ignore this email. Your account remains secure.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);">
                        <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.2);text-align:center;letter-spacing:0.1em;">
                          © ${new Date().getFullYear()} LootThread. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };

      await sgMail.send(msg);
    } catch (emailError: any) {
      // Log the error but don't expose it to the client
      console.error('[SendGrid Error]', emailError?.response?.body || emailError.message);
      // We still return success to the user — the OTP is saved, they can retry
    }
    // ── End SendGrid ───────────────────────────────────────────────────────

    res.status(200).json({ message: 'If an account with that email exists, an OTP was sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error processing request' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Reset Password (verify OTP)
// @route   POST /api/auth/reset-password
// @access  Public
// ---------------------------------------------------------------------------
export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required' });
  }

  try {
    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordOtp +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error processing request' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Update Password (authenticated)
// @route   PUT /api/auth/update-password
// @access  Private (requires JWT)
// ---------------------------------------------------------------------------
export const updatePassword = async (req: any, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }

  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Assign new password — the pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating password' });
  }
};
