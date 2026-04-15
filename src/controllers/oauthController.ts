import { Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// ---------------------------------------------------------------------------
// Helper: sign a JWT with full user payload for OAuth
// ---------------------------------------------------------------------------
const signToken = (id: string, role: string, name: string, email: string, avatarUrl?: string): string =>
  jwt.sign(
    { id, role, name, email, avatarUrl },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '30d') as any }
  );

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ===========================================================================
// GOOGLE OAUTH
// ===========================================================================

// @desc    Redirect to Google OAuth consent screen
// @route   GET /api/auth/google
export const googleOAuth = (_req: any, res: Response) => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri:  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

// @desc    Handle Google OAuth callback
// @route   GET /api/auth/google/callback
export const googleCallback = async (_req: any, res: Response) => {
  const { code } = _req.query;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await axios.post<any>('https://oauth2.googleapis.com/token', {
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
      grant_type:    'authorization_code',
    });

    const { access_token } = tokenRes.data;

    // 2. Fetch user profile
    const profileRes = await axios.get<any>('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { sub: googleId, email, name, picture } = profileRes.data;

    // 3. Upsert user
    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        // Link Google to existing email account
        user.googleId = googleId;
        if (!user.avatarUrl && picture) user.avatarUrl = picture;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          name,
          email,
          googleId,
          avatarUrl: picture,
          role: 'customer',
        });
      }
    }

    // 4. Issue JWT and redirect to frontend
    const token = signToken((user._id as any).toString(), user.role, user.name, user.email, user.avatarUrl);
    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`);
  } catch (error: any) {
    console.error('[Google OAuth Error]', error?.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
};

// ===========================================================================
// FACEBOOK OAUTH
// ===========================================================================

// @desc    Redirect to Facebook OAuth dialog
// @route   GET /api/auth/facebook
export const facebookOAuth = (_req: any, res: Response) => {
  const params = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID as string,
    redirect_uri:  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/facebook/callback`,
    scope:         'email,public_profile',
    response_type: 'code',
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`);
};

// @desc    Handle Facebook OAuth callback
// @route   GET /api/auth/facebook/callback
export const facebookCallback = async (_req: any, res: Response) => {
  const { code } = _req.query;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.get<any>('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id:     process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri:  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/facebook/callback`,
        code,
      },
    });

    const { access_token } = tokenRes.data;

    // 2. Fetch user profile (id, name, email, picture)
    const profileRes = await axios.get<any>('https://graph.facebook.com/me', {
      params: {
        fields:       'id,name,email,picture.type(large)',
        access_token,
      },
    });

    const profile = profileRes.data;
    const facebookId = String(profile.id);
    const email: string | undefined = profile.email;
    const avatarUrl: string | undefined = profile.picture?.data?.url;

    if (!email) {
      // Facebook may withhold email if user denies permission
      return res.redirect(`${FRONTEND_URL}/login?error=no_email`);
    }

    // 3. Upsert user
    let user = await User.findOne({ facebookId });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        // Link Facebook to existing email account
        user.facebookId = facebookId;
        if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          name:      profile.name,
          email,
          facebookId,
          avatarUrl,
          role:      'customer',
        });
      }
    }

    // 4. Issue JWT and redirect to frontend
    const token = signToken((user._id as any).toString(), user.role, user.name, user.email, user.avatarUrl);
    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`);
  } catch (error: any) {
    console.error('[Facebook OAuth Error]', error?.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
};
