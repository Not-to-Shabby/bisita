import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import User from '../models/User.js';
import GuideBooking from '../models/GuideBooking.js';
import { authenticate, AuthRequest, asHandler } from '../middleware/auth.js';
import { requireAdmin, requireVerifiedGuide } from '../middleware/roles.js';
import { sendGuideApprovalEmail } from '../utils/email.js';

const router = Router();

// ======================
// GET ALL GUIDES (Public)
// ======================
router.get(
  '/',
  [
    query('status').optional().isIn(['available', 'on_tour', 'unavailable']),
    query('verified').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req: any, res: Response): Promise<void> => {
    try {
      const {
        status,
        verified = 'true',
        limit = 20,
        offset = 0,
      } = req.query;

      const filter: Record<string, any> = {
        role: 'guide',
      };

      if (verified === 'true') {
        filter['guideProfile.isVerified'] = true;
      } else if (verified === 'false') {
        filter['guideProfile.isVerified'] = false;
      }

      if (status) {
        filter['guideProfile.status'] = status;
      }

      const [guides, total] = await Promise.all([
        User.find(filter, {
          email: 0,
          passwordHash: 0,
          googleId: 0,
          facebookId: 0,
        })
          .sort({ 'stats.rating': -1, createdAt: -1 })
          .skip(Number(offset))
          .limit(Number(limit))
          .lean(),
        User.countDocuments(filter),
      ]);

      res.json({
        guides,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + guides.length < total,
        },
      });
    } catch (error) {
      console.error('Error fetching guides:', error);
      res.status(500).json({ error: 'Failed to fetch guides' });
    }
  }
);

// ======================
// GET SINGLE GUIDE
// ======================
router.get(
  '/:id',
  async (req: any, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const guide = await User.findOne(
        { _id: id, role: 'guide' },
        {
          email: 0,
          passwordHash: 0,
          googleId: 0,
          facebookId: 0,
        }
      );

      if (!guide) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }

      res.json({ guide });
    } catch (error) {
      console.error('Error fetching guide:', error);
      res.status(500).json({ error: 'Failed to fetch guide' });
    }
  }
);

// ======================
// APPLY TO BE A GUIDE
// ======================
router.post(
  '/apply',
  authenticate,
  [
    body('bio').trim().isLength({ min: 50, max: 1000 }),
    body('languages').isArray({ min: 1 }),
    body('specialties').optional().isArray(),
    body('rate').optional().isFloat({ min: 0 }),
    body('phone').optional().isMobilePhone('any'),
    body('messenger').optional().isString(),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (req.user!.role === 'guide') {
        res.status(400).json({ error: 'You are already a guide' });
        return;
      }

      const { bio, languages, specialties, rate, phone, messenger } = req.body;

      req.user!.role = 'guide';
      req.user!.guideProfile = {
        bio,
        languages,
        specialties: specialties || [],
        rate,
        status: 'unavailable', // Until verified
        isVerified: false,
        verificationSubmittedAt: new Date(),
        phone,
        messenger,
      };

      await req.user!.save();

      res.json({
        message: 'Guide application submitted. Awaiting admin approval.',
        user: req.user,
      });
    } catch (error) {
      console.error('Error applying as guide:', error);
      res.status(500).json({ error: 'Failed to submit application' });
    }
  })
);

// ======================
// UPDATE GUIDE PROFILE
// ======================
router.patch(
  '/profile',
  authenticate,
  requireVerifiedGuide,
  [
    body('bio').optional().trim().isLength({ min: 50, max: 1000 }),
    body('languages').optional().isArray({ min: 1 }),
    body('specialties').optional().isArray(),
    body('rate').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['available', 'on_tour', 'unavailable']),
    body('phone').optional().isMobilePhone('any'),
    body('messenger').optional().isString(),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const allowedFields = ['bio', 'languages', 'specialties', 'rate', 'status', 'phone', 'messenger'];
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined && req.user!.guideProfile) {
          (req.user!.guideProfile as any)[field] = req.body[field];
        }
      }

      await req.user!.save();

      res.json({ user: req.user });
    } catch (error) {
      console.error('Error updating guide profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  })
);

// ======================
// VERIFY GUIDE (Admin)
// ======================
router.patch(
  '/:id/verify',
  authenticate,
  requireAdmin,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { approved } = req.body;

      const guide = await User.findOne({ _id: id, role: 'guide' });
      if (!guide) {
        res.status(404).json({ error: 'Guide not found' });
        return;
      }

      if (guide.guideProfile) {
        guide.guideProfile.isVerified = approved;
        if (approved) {
          guide.guideProfile.status = 'available';
        }
        guide.markModified('guideProfile');
      }

      await guide.save();

      // Send email notification
      await sendGuideApprovalEmail(guide.email, guide.username, approved);

      res.json({ guide });
    } catch (error) {
      console.error('Error verifying guide:', error);
      res.status(500).json({ error: 'Failed to verify guide' });
    }
  })
);

// ======================
// GET BOOKING REQUESTS (Guide)
// ======================
router.get(
  '/bookings/requests',
  authenticate,
  requireVerifiedGuide,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const bookings = await GuideBooking.find({
        guideId: req.user!._id,
      })
        .populate('touristId', 'username avatar email')
        .populate('attractionIds', 'name slug')
        .sort({ date: -1 });

      res.json({ bookings });
    } catch (error) {
      console.error('Error fetching booking requests:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  })
);

// ======================
// CREATE BOOKING
// ======================
router.post(
  '/bookings',
  authenticate,
  [
    body('guideId').isMongoId(),
    body('attractionIds').isArray({ min: 1 }),
    body('date').isISO8601(),
    body('duration').isInt({ min: 1 }),
    body('groupSize').isInt({ min: 1, max: 50 }),
    body('notes').optional().trim().isLength({ max: 500 }),
    body('startTime').optional().isString(),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { guideId, attractionIds, date, duration, groupSize, notes, startTime } = req.body;

      // Verify guide exists and is available
      const guide = await User.findOne({
        _id: guideId,
        role: 'guide',
        'guideProfile.isVerified': true,
      });

      if (!guide) {
        res.status(404).json({ error: 'Guide not found or not available' });
        return;
      }

      // Create booking
      const booking = await GuideBooking.create({
        touristId: req.user!._id,
        guideId,
        attractionIds,
        date: new Date(date),
        startTime: startTime || '09:00',
        duration,
        groupSize,
        notes,
        totalPrice: (guide.guideProfile?.rate || 500) * duration * (groupSize > 4 ? 1.5 : 1),
        status: 'pending',
      });

      await booking.populate([
        { path: 'touristId', select: 'username avatar' },
        { path: 'guideId', select: 'username avatar guideProfile' },
        { path: 'attractionIds', select: 'name slug' },
      ]);

      res.status(201).json({ booking });
    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  })
);

// ======================
// GET MY BOOKINGS (Unified)
// ======================
router.get(
  '/bookings/mine',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const isGuide = req.user!.role === 'guide';
      
      const filter = isGuide 
        ? { guideId: req.user!._id }
        : { touristId: req.user!._id };

      const bookings = await GuideBooking.find(filter)
        .populate('touristId', 'username avatar email')
        .populate('guideId', 'username avatar guideProfile')
        .populate('attractionIds', 'name slug')
        .sort({ date: -1 });

      res.json({ bookings });
    } catch (error) {
      console.error('Error fetching my bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  })
);

// ======================
// GET MY BOOKINGS (Tourist)
// ======================
router.get(
  '/bookings/tourist',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const bookings = await GuideBooking.find({
        touristId: req.user!._id,
      })
        .populate('guideId', 'username avatar guideProfile')
        .populate('attractionIds', 'name slug')
        .sort({ date: -1 });

      res.json({ bookings });
    } catch (error) {
      console.error('Error fetching tourist bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  })
);

// ======================
// GET MY BOOKINGS (Guide)
// ======================
router.get(
  '/bookings/guide',
  authenticate,
  requireVerifiedGuide,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const bookings = await GuideBooking.find({
        guideId: req.user!._id,
      })
        .populate('touristId', 'username avatar email')
        .populate('attractionIds', 'name slug')
        .sort({ date: -1 });

      res.json({ bookings });
    } catch (error) {
      console.error('Error fetching guide bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  })
);

// ======================
// UPDATE BOOKING STATUS (Guide)
// ======================
router.patch(
  '/bookings/:id/status',
  authenticate,
  requireVerifiedGuide,
  [
    body('status').isIn(['accepted', 'declined', 'completed']),
    body('response').optional().trim().isLength({ max: 500 }),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { status, response } = req.body;

      const booking = await GuideBooking.findOne({
        _id: id,
        guideId: req.user!._id,
      });

      if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
      }

      // Validate status transitions
      if (booking.status === 'cancelled') {
        res.status(400).json({ error: 'Cannot update cancelled booking' });
        return;
      }

      booking.status = status;
      if (response) booking.guideResponse = response;
      if (status !== 'pending') booking.respondedAt = new Date();
      
      await booking.save();

      await booking.populate([
        { path: 'touristId', select: 'username avatar email' },
        { path: 'attractionIds', select: 'name slug' },
      ]);

      res.json({ booking });
    } catch (error) {
      console.error('Error updating booking status:', error);
      res.status(500).json({ error: 'Failed to update booking status' });
    }
  })
);

// ======================
// CANCEL BOOKING
// ======================
router.patch(
  '/bookings/:id/cancel',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const booking = await GuideBooking.findOne({
        _id: id,
        $or: [
          { touristId: req.user!._id },
          { guideId: req.user!._id },
        ],
        status: { $in: ['pending', 'accepted'] },
      });

      if (!booking) {
        res.status(404).json({ error: 'Booking not found or cannot be cancelled' });
        return;
      }

      booking.status = 'cancelled';
      await booking.save();

      res.json({ booking });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(500).json({ error: 'Failed to cancel booking' });
    }
  })
);

export default router;
