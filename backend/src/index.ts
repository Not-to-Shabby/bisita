import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import passport from 'passport';

// Load environment variables first
dotenv.config();

import connectDB from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import configurePassport from './config/passport.js';

// Import routes
import authRoutes from './routes/auth.js';
import attractionRoutes from './routes/attractions.js';
import businessRoutes from './routes/businesses.js';
import reviewRoutes from './routes/reviews.js';
import mediaRoutes from './routes/media.js';
import guideRoutes from './routes/guides.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ======================
// MIDDLEWARE
// ======================

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Health check
app.get('/health', (_req: Request, res: Response) => {
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
  try {
    // Connect to MongoDB
    await connectDB();

    // Configure services
    configureCloudinary();
    configurePassport();

    // Start server
    app.listen(PORT, () => {
      console.log(`
🌊 Bisita Iligan API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port ${PORT}
✅ Environment: ${process.env.NODE_ENV || 'development'}
✅ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
