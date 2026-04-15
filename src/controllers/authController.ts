import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// ---------------------------------------------------------------------------
// Helper: sign a JWT
// ---------------------------------------------------------------------------
const signToken = (id: string, role: string): string =>
  // Cast expiresIn: jsonwebtoken v9 uses branded ms.StringValue; env strings are valid at runtime
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
    // Explicitly select password (it is select:false on the model)
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
// @desc    Forgot Password (generate OTP)
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

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP and expiry (15 mins)
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // STUB: Email delivery
    console.log(`\n\n=== EMAIL DELIVERY STUB ===\nTo: ${email}\nOTP: ${otp}\n===========================\n\n`);

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
      resetPasswordExpires: { $gt: Date.now() } // ensure it hasn't expired
    }).select('+resetPasswordOtp +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update password, clear OTP
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error processing request' });
  }
};
