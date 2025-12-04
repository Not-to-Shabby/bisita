import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

// Type helper for route handlers that use AuthRequest
export type AuthRequestHandler = (
  req: AuthRequest,
  res: Response,
  next?: NextFunction
) => void | Promise<void>;

// Helper to cast AuthRequestHandler to Express RequestHandler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asHandler = (handler: AuthRequestHandler): any => {
  return handler;
};

export interface JwtPayload {
  userId: string;
  role: string;
}

// Verify JWT and attach user to request
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from cookie or Authorization header
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    (req as AuthRequest).user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Optional auth - doesn't fail if no token, but attaches user if present
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return next();
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return next();
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = await User.findById(decoded.userId);
    
    if (user) {
      (req as AuthRequest).user = user;
    }
    
    next();
  } catch {
    // Silently continue without user
    next();
  }
};

// Generate access and refresh tokens
export const generateTokens = (user: IUser): { accessToken: string; refreshToken: string } => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT secrets not configured');
  }

  const payload: JwtPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES || '15m';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES || '7d';

  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: accessExpiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
};

// Set auth cookies
export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// Clear auth cookies
export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
};
