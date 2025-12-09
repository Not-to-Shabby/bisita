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

export default router;
