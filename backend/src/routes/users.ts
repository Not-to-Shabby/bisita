import express, { Response } from 'express';
import User from '../models/User.js';
import { authenticate, AuthRequest, asHandler } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

const router = express.Router();

// GET /api/users - Get all users (Admin only)
router.get('/', authenticate, requireAdmin, asHandler(async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find()
      .select('-passwordHash -emailVerificationToken -passwordResetToken')
      .sort({ createdAt: -1 });
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}));

// PATCH /api/users/:id/email-verified - Manually set email verification (Admin only)
router.patch('/:id/email-verified', authenticate, requireAdmin, asHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isEmailVerified } = req.body as { isEmailVerified?: unknown };

    if (typeof isEmailVerified !== 'boolean') {
      res.status(400).json({ error: 'isEmailVerified must be a boolean' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.isEmailVerified = isEmailVerified;

    // If we are manually verifying, clear any pending tokens so the state is consistent
    if (isEmailVerified) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
    }

    await user.save();

    res.json({
      message: 'Email verification updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      }
    });
  } catch (error) {
    console.error('Error updating email verification:', error);
    res.status(500).json({ error: 'Failed to update email verification' });
  }
}));

// PATCH /api/users/:id/role - Update user role (Admin only)
router.patch('/:id/role', authenticate, requireAdmin, asHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, managedEntityId } = req.body;

    if (!['tourist', 'guide', 'business_owner', 'manager', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.role = role;
    
    if (role === 'manager') {
      user.managedEntityId = managedEntityId;
    } else {
      user.managedEntityId = undefined;
    }

    await user.save();

    res.json({ 
      message: 'User role updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        managedEntityId: user.managedEntityId
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
}));

// PATCH /api/users/:id/password - Manually reset user password (Admin only)
router.patch('/:id/password', authenticate, requireAdmin, asHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // The pre-save hook in User model will hash this
    user.passwordHash = password;
    
    // Clear reset tokens if any
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({ 
      message: 'User password updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error updating user password:', error);
    res.status(500).json({ error: 'Failed to update user password' });
  }
}));

export default router;
