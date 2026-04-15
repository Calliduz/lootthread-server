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
