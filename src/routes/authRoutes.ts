import express from 'express';
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  updatePassword,
} from '../controllers/authController';
import {
  googleOAuth,
  googleCallback,
  facebookOAuth,
  facebookCallback,
} from '../controllers/oauthController';
import { protect } from '../middleware/auth';

const router = express.Router();

// ── Standard Auth ──────────────────────────────────────────────────────────
router.post('/register',       registerUser);
router.post('/login',          loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

// ── Protected Auth (requires JWT) ─────────────────────────────────────────
router.put('/update-password', protect, updatePassword);

// ── Google OAuth ───────────────────────────────────────────────────────────
router.get('/google',          googleOAuth);
router.get('/google/callback', googleCallback);

// ── Facebook OAuth ─────────────────────────────────────────────────────────
router.get('/facebook',          facebookOAuth);
router.get('/facebook/callback', facebookCallback);

export default router;
