import { Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest, asHandler } from './auth.js';
import { UserRole } from '../models/User.js';

// Check if user has required role(s)
export const requireRole = (...allowedRoles: UserRole[]): RequestHandler => {
  return asHandler((req: AuthRequest, res: Response, next?: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next?.();
  });
};

// Shorthand role guards
export const requireAdmin = requireRole('admin');
export const requireGuide = requireRole('guide', 'admin');
export const requireBusinessOwner = requireRole('business_owner', 'admin');

// Check if user is accessing their own resource or is admin
export const requireOwnerOrAdmin = (
  getOwnerId: (req: AuthRequest) => string | undefined
): RequestHandler => {
  return asHandler((req: AuthRequest, res: Response, next?: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const ownerId = getOwnerId(req);
    const isOwner = ownerId && req.user._id.toString() === ownerId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    next?.();
  });
};

// Require email to be verified
export const requireVerifiedEmail: RequestHandler = asHandler((
  req: AuthRequest,
  res: Response,
  next?: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.isEmailVerified) {
    res.status(403).json({ 
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
    return;
  }

  next?.();
});

// Require guide to be verified (for bookings)
export const requireVerifiedGuide: RequestHandler = asHandler((
  req: AuthRequest,
  res: Response,
  next?: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'guide' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Guide access required' });
    return;
  }

  if (req.user.role === 'guide' && !req.user.guideProfile?.isVerified) {
    res.status(403).json({ 
      error: 'Guide verification pending',
      code: 'GUIDE_NOT_VERIFIED'
    });
    return;
  }

  next?.();
});
