import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import Business from '../models/Business.js';
import { authenticate, optionalAuth, AuthRequest, asHandler } from '../middleware/auth.js';
import { requireAdmin, requireOwnerOrAdmin } from '../middleware/roles.js';

const router = Router();

// Helper to generate slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ======================
// GET ALL BUSINESSES
// ======================
router.get(
  '/',
  optionalAuth,
  [
    query('type').optional().isString(),
    query('verified').optional().isBoolean(),
    query('search').optional().isString(),
    query('nearAttraction').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        type,
        verified,
        search,
        nearAttraction,
        limit = 20,
        offset = 0,
      } = req.query;

      const filter: Record<string, any> = { status: 'active' };

      if (type) {
        filter.type = type;
      }

      if (verified === 'true') {
        filter.isVerified = true;
      }

      if (search) {
        filter.$text = { $search: search as string };
      }

      if (nearAttraction) {
        filter.nearAttractionIds = nearAttraction;
      }

      const [businesses, total] = await Promise.all([
        Business.find(filter)
          .sort({ isVerified: -1, 'stats.rating': -1, createdAt: -1 })
          .skip(Number(offset))
          .limit(Number(limit))
          .lean(),
        Business.countDocuments(filter),
      ]);

      res.json({
        businesses,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + businesses.length < total,
        },
      });
    } catch (error) {
      console.error('Error fetching businesses:', error);
      res.status(500).json({ error: 'Failed to fetch businesses' });
    }
  }
);

// ======================
// GET SINGLE BUSINESS
// ======================
router.get(
  '/:idOrSlug',
  optionalAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { idOrSlug } = req.params;

      let business = await Business.findOne({
        $or: [
          { slug: idOrSlug },
          { legacyId: idOrSlug },
        ],
        status: 'active',
      }).populate('ownerId', 'username avatar');

      if (!business && idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
        business = await Business.findOne({
          _id: idOrSlug,
          status: 'active',
        }).populate('ownerId', 'username avatar');
      }

      if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
      }

      res.json({ business });
    } catch (error) {
      console.error('Error fetching business:', error);
      res.status(500).json({ error: 'Failed to fetch business' });
    }
  }
);

// ======================
// GET MY BUSINESSES
// ======================
router.get(
  '/me/list',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const businesses = await Business.find({
        ownerId: req.user!._id,
      }).sort({ createdAt: -1 });

      res.json({ businesses });
    } catch (error) {
      console.error('Error fetching user businesses:', error);
      res.status(500).json({ error: 'Failed to fetch businesses' });
    }
  })
);

// ======================
// CREATE BUSINESS
// ======================
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('type').isIn(['accommodation', 'restaurant', 'activity', 'guide_service', 'shop', 'transport']),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('location.address').trim().notEmpty(),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name } = req.body;

      // Generate unique slug
      let slug = generateSlug(name);
      const existingSlug = await Business.findOne({ slug });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      const business = await Business.create({
        ...req.body,
        slug,
        ownerId: req.user!._id,
        status: 'pending', // Requires approval
        isVerified: false,
      });

      // Update user role if first business
      if (req.user!.role === 'tourist') {
        req.user!.role = 'business_owner';
        await req.user!.save();
      }

      res.status(201).json({ business });
    } catch (error) {
      console.error('Error creating business:', error);
      res.status(500).json({ error: 'Failed to create business' });
    }
  })
);

// ======================
// UPDATE BUSINESS
// ======================
router.patch(
  '/:id',
  authenticate,
  requireOwnerOrAdmin((req) => {
    // This will be checked after fetching the business
    return undefined;
  }),
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const business = await Business.findById(id);
      if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
      }

      // Check ownership
      const isOwner = business.ownerId.toString() === req.user!._id.toString();
      const isAdmin = req.user!.role === 'admin';

      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Prevent changing certain fields
      delete req.body.slug;
      delete req.body.ownerId;
      
      // Only admin can change verification status
      if (!isAdmin) {
        delete req.body.isVerified;
        delete req.body.status;
      }

      Object.assign(business, req.body);
      await business.save();

      res.json({ business });
    } catch (error) {
      console.error('Error updating business:', error);
      res.status(500).json({ error: 'Failed to update business' });
    }
  })
);

// ======================
// VERIFY BUSINESS (Admin)
// ======================
router.patch(
  '/:id/verify',
  authenticate,
  requireAdmin,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { verified } = req.body;

      const business = await Business.findByIdAndUpdate(
        id,
        { 
          isVerified: verified,
          status: verified ? 'active' : 'pending',
        },
        { new: true }
      );

      if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
      }

      res.json({ business });
    } catch (error) {
      console.error('Error verifying business:', error);
      res.status(500).json({ error: 'Failed to verify business' });
    }
  })
);

// ======================
// DELETE BUSINESS
// ======================
router.delete(
  '/:id',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const business = await Business.findById(id);
      if (!business) {
        res.status(404).json({ error: 'Business not found' });
        return;
      }

      const isOwner = business.ownerId.toString() === req.user!._id.toString();
      const isAdmin = req.user!.role === 'admin';

      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Soft delete
      business.status = 'suspended';
      await business.save();

      res.json({ message: 'Business removed successfully' });
    } catch (error) {
      console.error('Error deleting business:', error);
      res.status(500).json({ error: 'Failed to delete business' });
    }
  })
);

export default router;
