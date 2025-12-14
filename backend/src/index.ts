import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import passport from 'passport';
import cron from 'node-cron';

// Load environment variables first
dotenv.config();

import connectDB from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import configurePassport from './config/passport.js';
import Quest from './models/Quest.js';

// Import routes
import authRoutes from './routes/auth.js';
import attractionRoutes from './routes/attractions.js';
import businessRoutes from './routes/businesses.js';
import reviewRoutes from './routes/reviews.js';
import mediaRoutes from './routes/media.js';
import guideRoutes from './routes/guides.js';
import eventRoutes from './routes/events.js';
import userRoutes from './routes/users.js';
import questRoutes from './routes/quests.js';
import gamificationRoutes from './routes/gamification.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ======================
// MIDDLEWARE
// ======================

// CORS configuration - support frontend URLs
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4000',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  'https://localhost:5173',
  'https://localhost:5174',
  // Vercel deployment URLs
  'https://bisita.vercel.app',
  'https://bisita-iligan.vercel.app',
];

// Add any Vercel preview URLs (they have random subdomains)
const isVercelPreview = (origin: string): boolean => {
  return origin.includes('vercel.app') || origin.includes('vercel.sh');
};

app.use(cors({
  origin: (origin, callback) => {
    // In development, allow ANY origin by reflecting it
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Allow requests with no origin (like health checks, mobile apps, curl)
    if (!origin) return callback(null, true);
    
    // Allow if in allowedOrigins list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow local network IPs (192.168.x.x)
    if (origin && origin.match(/^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow Vercel preview deployments
    if (isVercelPreview(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log('CORS rejected origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Passport initialization
app.use(passport.initialize());

// ======================
// ROUTES
// ======================

// Health check (both /health and /api/health for Railway)
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/attractions', attractionRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/gamification', gamificationRoutes);

// ======================
// ERROR HANDLING
// ======================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// ======================
// SERVER STARTUP
// ======================

const startServer = async (): Promise<void> => {
  // Start server FIRST so health checks pass immediately
  const server = app.listen(PORT, () => {
    console.log(`
🌊 Bisita Iligan API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  });

  try {
    // Connect to MongoDB after server is listening
    await connectDB();

    // Configure services
    configureCloudinary();
    configurePassport();

    // Schedule daily cron job at midnight to auto-deactivate expired quests
    cron.schedule('0 0 * * *', async () => {
      try {
        const now = new Date();
        const result = await Quest.updateMany(
          { endDate: { $lt: now }, isActive: true },
          { isActive: false }
        );
        if (result.modifiedCount > 0) {
          console.log(`🕐 Cron: Auto-deactivated ${result.modifiedCount} expired quest(s)`);
        }
      } catch (error) {
        console.error('❌ Cron: Failed to deactivate expired quests:', error);
      }
    });
    console.log('🕐 Cron job scheduled: Quest auto-deactivation at midnight');
    
    console.log('✅ All services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    server.close();
    process.exit(1);
  }
};

startServer();

export default app;
