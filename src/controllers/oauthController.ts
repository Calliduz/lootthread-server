import { Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// ---------------------------------------------------------------------------
// Helper: sign a JWT
// ---------------------------------------------------------------------------
const signToken = (id: string, role: string): string =>
  jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '30d') as any,
  });

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
    const token = signToken((user._id as any).toString(), user.role);
    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`);
  } catch (error: any) {
    console.error('[Google OAuth Error]', error?.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
};

// ===========================================================================
// GITHUB OAUTH
// ===========================================================================

// @desc    Redirect to GitHub OAuth authorization page
// @route   GET /api/auth/github
export const githubOAuth = (_req: any, res: Response) => {
  const params = new URLSearchParams({
    client_id:    process.env.GITHUB_CLIENT_ID as string,
    redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`,
    scope:        'read:user user:email',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
};

// @desc    Handle GitHub OAuth callback
// @route   GET /api/auth/github/callback
export const githubCallback = async (_req: any, res: Response) => {
  const { code } = _req.query;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.post<any>(
      'https://github.com/login/oauth/access_token',
      {
        client_id:     process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`,
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token } = tokenRes.data;

    // 2. Fetch user profile
    const profileRes = await axios.get<any>('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = profileRes.data;

    // 3. Get primary email (GitHub may not expose it in profile)
    let email = profile.email;
    if (!email) {
      const emailsRes = await axios.get<any[]>('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const primary = emailsRes.data.find((e: any) => e.primary && e.verified);
      email = primary?.email;
    }

    if (!email) {
      return res.redirect(`${FRONTEND_URL}/login?error=no_email`);
    }

    const githubId = String(profile.id);

    // 4. Upsert user
    let user = await User.findOne({ githubId });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.githubId = githubId;
        if (!user.avatarUrl) user.avatarUrl = profile.avatar_url;
        await user.save();
      } else {
        user = await User.create({
          name:      profile.name || profile.login,
          email,
          githubId,
          avatarUrl: profile.avatar_url,
          role:      'customer',
        });
      }
    }

    // 5. Issue JWT and redirect to frontend
    const token = signToken((user._id as any).toString(), user.role);
    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`);
  } catch (error: any) {
    console.error('[GitHub OAuth Error]', error?.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
};
