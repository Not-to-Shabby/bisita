import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import {
  authenticate,
  AuthRequest,
  generateTokens,
  setAuthCookies,
  clearAuthCookies,
  JwtPayload,
  asHandler,
} from '../middleware/auth.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../utils/email.js';

const router = Router();

// ======================
// REGISTER
// ======================
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('username')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Username must be 2-50 characters'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, username } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await User.create({
        email,
        passwordHash: password, // Will be hashed by pre-save hook
        username,
        role: 'tourist',
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      // Send verification email
      await sendVerificationEmail(email, username, verificationToken);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);
      setAuthCookies(res, accessToken, refreshToken);

      res.status(201).json({
        message: 'Registration successful. Please verify your email.',
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ======================
// LOGIN
// ======================
router.post(
  '/login',
  [
    body('email').notEmpty().withMessage('Email or username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email: identifier, password } = req.body;

      // Find user with password by email OR username
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: { $regex: new RegExp(`^${identifier}$`, 'i') } }
        ]
      }).select('+passwordHash');

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: 'Invalid email/username or password' });
        return;
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email/username or password' });
        return;
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);
      setAuthCookies(res, accessToken, refreshToken);

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ======================
// LOGOUT
// ======================
router.post('/logout', (_req: Request, res: Response): void => {
  clearAuthCookies(res);
  res.json({ message: 'Logged out successfully' });
});

// ======================
// REFRESH TOKEN
// ======================
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET not configured');
    }

    const decoded = jwt.verify(refreshToken, secret) as JwtPayload;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Generate new tokens
    const tokens = generateTokens(user);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    clearAuthCookies(res);
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ======================
// VERIFY EMAIL
// ======================
router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Verification token required' });
      return;
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ======================
// REQUEST PASSWORD RESET
// ======================
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email } = req.body;
      const user = await User.findOne({ email });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({ message: 'If that email exists, a reset link has been sent.' });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      await sendPasswordResetEmail(email, user.username, resetToken);

      res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  }
);

// ======================
// RESET PASSWORD
// ======================
router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { token, password } = req.body;

      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      user.passwordHash = password; // Will be hashed by pre-save hook
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Password reset failed' });
    }
  }
);

// ======================
// GET CURRENT USER
// ======================
router.get('/me', authenticate, asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    user: {
      id: req.user!._id,
      email: req.user!.email,
      username: req.user!.username,
      role: req.user!.role,
      avatar: req.user!.avatar,
      isEmailVerified: req.user!.isEmailVerified,
      guideProfile: req.user!.guideProfile,
      stats: req.user!.stats,
      createdAt: req.user!.createdAt,
    },
  });
}));

// ======================
// UPDATE PROFILE
// ======================
router.put(
  '/profile',
  authenticate,
  [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Username must be 2-50 characters'),
    body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { username, avatar } = req.body;
      const updates: { username?: string; avatar?: string } = {};

      if (username) updates.username = username;
      if (avatar) updates.avatar = avatar;

      const user = await User.findByIdAndUpdate(
        req.user!._id,
        { $set: updates },
        { new: true }
      );

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        message: 'Profile updated',
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          guideProfile: user.guideProfile,
          stats: user.stats,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  })
);

// ======================
// RESEND VERIFICATION EMAIL
// ======================
router.post('/resend-verification', authenticate, asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    if (user.isEmailVerified) {
      res.status(400).json({ error: 'Email already verified' });
      return;
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await User.findByIdAndUpdate(user._id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    await sendVerificationEmail(user.email, user.username, verificationToken);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
}));

// ======================
// GOOGLE OAUTH
// ======================
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth' }),
  asHandler((req: AuthRequest, res: Response): void => {
    if (!req.user) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth`);
      return;
    }

    const { accessToken, refreshToken } = generateTokens(req.user);
    setAuthCookies(res, accessToken, refreshToken);
    
    res.redirect(`${process.env.FRONTEND_URL}/home?login=success`);
  })
);

// ======================
// FACEBOOK OAUTH
// ======================
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login?error=oauth' }),
  asHandler((req: AuthRequest, res: Response): void => {
    if (!req.user) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth`);
      return;
    }

    const { accessToken, refreshToken } = generateTokens(req.user);
    setAuthCookies(res, accessToken, refreshToken);
    
    res.redirect(`${process.env.FRONTEND_URL}/home?login=success`);
  })
);

export default router;
