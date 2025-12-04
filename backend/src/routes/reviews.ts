import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Attraction from '../models/Attraction.js';
import Business from '../models/Business.js';
import User from '../models/User.js';
import { authenticate, optionalAuth, AuthRequest, asHandler } from '../middleware/auth.js';
import { requireAdmin, requireVerifiedEmail } from '../middleware/roles.js';

const router = Router();

// Helper to update target stats
const updateTargetStats = async (
  targetType: string,
  targetId: mongoose.Types.ObjectId
): Promise<void> => {
  const stats = await Review.aggregate([
    {
      $match: {
        targetType,
        targetId,
        status: 'published',
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const rating = stats[0]?.avgRating || 0;
  const reviewCount = stats[0]?.count || 0;

  const updateData = {
    'stats.rating': Math.round(rating * 10) / 10,
    'stats.reviewCount': reviewCount,
  };

  if (targetType === 'attraction') {
    await Attraction.findByIdAndUpdate(targetId, updateData);
  } else if (targetType === 'business') {
    await Business.findByIdAndUpdate(targetId, updateData);
  } else {
    await User.findByIdAndUpdate(targetId, updateData);
  }
};

// ======================
// GET REVIEWS FOR TARGET
// ======================
router.get(
  '/',
  [
    query('targetType').isIn(['attraction', 'business', 'guide']),
    query('targetId').notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { targetType, targetId, limit = 20, offset = 0 } = req.query;

      const filter = {
        targetType,
        targetId,
        status: 'published',
      };

      const [reviews, total] = await Promise.all([
        Review.find(filter)
          .populate('userId', 'username avatar')
          .sort({ createdAt: -1 })
          .skip(Number(offset))
          .limit(Number(limit))
          .lean(),
        Review.countDocuments(filter),
      ]);

      res.json({
        reviews,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + reviews.length < total,
        },
      });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  }
);

// ======================
// GET MY REVIEWS
// ======================
router.get(
  '/me',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const reviews = await Review.find({
        userId: req.user!._id,
      }).sort({ createdAt: -1 });

      res.json({ reviews });
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  })
);

// ======================
// CREATE REVIEW
// ======================
router.post(
  '/',
  authenticate,
  requireVerifiedEmail,
  [
    body('targetType').isIn(['attraction', 'business', 'guide']),
    body('targetId').notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('text').trim().isLength({ min: 10, max: 2000 }),
    body('title').optional().trim().isLength({ max: 100 }),
    body('images').optional().isArray({ max: 5 }),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { targetType, targetId, rating, text, title, images } = req.body;

      // Check for existing review (one per user per target)
      const existingReview = await Review.findOne({
        userId: req.user!._id,
        targetType,
        targetId,
      });

      if (existingReview) {
        res.status(409).json({ 
          error: 'You have already reviewed this item',
          existingReviewId: existingReview._id,
        });
        return;
      }

      // Verify target exists
      let target;
      if (targetType === 'attraction') {
        target = await Attraction.findById(targetId);
      } else if (targetType === 'business') {
        target = await Business.findById(targetId);
      } else {
        target = await User.findById(targetId);
      }
      
      if (!target) {
        res.status(404).json({ error: `${targetType} not found` });
        return;
      }

      // Create review
      const review = await Review.create({
        userId: req.user!._id,
        targetType,
        targetId,
        rating,
        text,
        title,
        images: images || [],
        status: 'published', // Auto-publish per requirements
      });

      // Update user stats
      await User.findByIdAndUpdate(req.user!._id, {
        $inc: { 'stats.reviewCount': 1, 'stats.contributionCount': 1 },
      });

      // Update target stats (async, don't wait)
      updateTargetStats(targetType, targetId).catch(console.error);

      // Populate user for response
      await review.populate('userId', 'username avatar');

      res.status(201).json({ review });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ error: 'Failed to create review' });
    }
  })
);

// ======================
// UPDATE REVIEW
// ======================
router.patch(
  '/:id',
  authenticate,
  [
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('text').optional().trim().isLength({ min: 10, max: 2000 }),
    body('title').optional().trim().isLength({ max: 100 }),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const review = await Review.findById(id);

      if (!review) {
        res.status(404).json({ error: 'Review not found' });
        return;
      }

      // Check ownership
      if (review.userId.toString() !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Check edit window (12 hours)
      if (new Date() > review.editableUntil) {
        res.status(403).json({ 
          error: 'Edit window expired',
          message: 'Reviews can only be edited within 12 hours of posting',
        });
        return;
      }

      // Update allowed fields
      const { rating, text, title } = req.body;
      if (rating !== undefined) review.rating = rating;
      if (text !== undefined) review.text = text;
      if (title !== undefined) review.title = title;
      review.isEdited = true;

      await review.save();

      // Update target stats
      updateTargetStats(review.targetType, review.targetId).catch(console.error);

      res.json({ review });
    } catch (error) {
      console.error('Error updating review:', error);
      res.status(500).json({ error: 'Failed to update review' });
    }
  })
);

// ======================
// DELETE REVIEW
// ======================
router.delete(
  '/:id',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const review = await Review.findById(id);

      if (!review) {
        res.status(404).json({ error: 'Review not found' });
        return;
      }

      // Check ownership or admin
      const isOwner = review.userId.toString() === req.user!._id.toString();
      const isAdmin = req.user!.role === 'admin';

      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Soft delete
      review.status = 'removed';
      await review.save();

      // Update user stats
      await User.findByIdAndUpdate(review.userId, {
        $inc: { 'stats.reviewCount': -1 },
      });

      // Update target stats
      updateTargetStats(review.targetType, review.targetId).catch(console.error);

      res.json({ message: 'Review deleted successfully' });
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({ error: 'Failed to delete review' });
    }
  })
);

// ======================
// FLAG REVIEW (Admin)
// ======================
router.patch(
  '/:id/flag',
  authenticate,
  requireAdmin,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { flagged } = req.body;

      const review = await Review.findByIdAndUpdate(
        id,
        { status: flagged ? 'flagged' : 'published' },
        { new: true }
      );

      if (!review) {
        res.status(404).json({ error: 'Review not found' });
        return;
      }

      res.json({ review });
    } catch (error) {
      console.error('Error flagging review:', error);
      res.status(500).json({ error: 'Failed to flag review' });
    }
  })
);

export default router;
