import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import Attraction from '../models/Attraction.js';
import { authenticate, optionalAuth, AuthRequest, asHandler } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

const router = Router();

// Helper to generate slug from name
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
// GET ALL ATTRACTIONS
// ======================
router.get(
  '/',
  optionalAuth,
  [
    query('category').optional().isString(),
    query('featured').optional().isBoolean(),
    query('search').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        category,
        featured,
        search,
        limit = 20,
        offset = 0,
      } = req.query;

      // Build query
      const filter: Record<string, any> = { status: 'active' };

      if (category) {
        filter.category = category;
      }

      if (featured === 'true') {
        filter.isFeatured = true;
      }

      if (search) {
        filter.$text = { $search: search as string };
      }

      const [attractions, total] = await Promise.all([
        Attraction.find(filter)
          .sort({ isFeatured: -1, 'stats.rating': -1, createdAt: -1 })
          .skip(Number(offset))
          .limit(Number(limit))
          .lean(),
        Attraction.countDocuments(filter),
      ]);

      res.json({
        attractions,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + attractions.length < total,
        },
      });
    } catch (error) {
      console.error('Error fetching attractions:', error);
      res.status(500).json({ error: 'Failed to fetch attractions' });
    }
  }
);

// ======================
// GET SINGLE ATTRACTION
// ======================
router.get(
  '/:idOrSlug',
  optionalAuth,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { idOrSlug } = req.params;

      // Try to find by _id, slug, or legacyId
      let attraction = await Attraction.findOne({
        $or: [
          { slug: idOrSlug },
          { legacyId: idOrSlug },
        ],
        status: 'active',
      });

      // Also try MongoDB ObjectId if valid
      if (!attraction && idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
        attraction = await Attraction.findOne({
          _id: idOrSlug,
          status: 'active',
        });
      }

      if (!attraction) {
        res.status(404).json({ error: 'Attraction not found' });
        return;
      }

      // Increment view count (fire and forget)
      Attraction.updateOne(
        { _id: attraction._id },
        { $inc: { 'stats.viewCount': 1 } }
      ).exec();

      res.json({ attraction });
    } catch (error) {
      console.error('Error fetching attraction:', error);
      res.status(500).json({ error: 'Failed to fetch attraction' });
    }
  })
);

// ======================
// GET ATTRACTIONS FOR MAP
// ======================
router.get(
  '/map/locations',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const attractions = await Attraction.find(
        { status: 'active' },
        {
          name: 1,
          slug: 1,
          legacyId: 1,
          'location.coordinates': 1,
          'images': { $slice: 1 },
          category: 1,
          transport: 1,
          'stats.rating': 1,
        }
      ).lean();

      res.json({ locations: attractions });
    } catch (error) {
      console.error('Error fetching map locations:', error);
      res.status(500).json({ error: 'Failed to fetch locations' });
    }
  }
);

// ======================
// CREATE ATTRACTION (Admin)
// ======================
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').isIn(['waterfall', 'spring', 'heritage', 'park', 'viewpoint', 'museum', 'religious', 'other']),
    body('location.address').trim().notEmpty(),
    body('location.coordinates.lat').isFloat({ min: -90, max: 90 }),
    body('location.coordinates.lng').isFloat({ min: -180, max: 180 }),
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
      const existingSlug = await Attraction.findOne({ slug });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      const attraction = await Attraction.create({
        ...req.body,
        slug,
        status: 'active',
      });

      res.status(201).json({ attraction });
    } catch (error) {
      console.error('Error creating attraction:', error);
      res.status(500).json({ error: 'Failed to create attraction' });
    }
  })
);

// ======================
// UPDATE ATTRACTION (Admin)
// ======================
router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Prevent changing slug directly
      delete req.body.slug;

      const attraction = await Attraction.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
      );

      if (!attraction) {
        res.status(404).json({ error: 'Attraction not found' });
        return;
      }

      res.json({ attraction });
    } catch (error) {
      console.error('Error updating attraction:', error);
      res.status(500).json({ error: 'Failed to update attraction' });
    }
  })
);

// ======================
// DELETE ATTRACTION (Admin)
// ======================
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Soft delete - set status to archived
      const attraction = await Attraction.findByIdAndUpdate(
        id,
        { status: 'archived' },
        { new: true }
      );

      if (!attraction) {
        res.status(404).json({ error: 'Attraction not found' });
        return;
      }

      res.json({ message: 'Attraction archived successfully' });
    } catch (error) {
      console.error('Error deleting attraction:', error);
      res.status(500).json({ error: 'Failed to delete attraction' });
    }
  })
);

export default router;
