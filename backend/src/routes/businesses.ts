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
    query('featured').optional().isBoolean(),
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
        featured,
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

      if (featured === 'true') {
        filter.isFeatured = true;
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
// GET ALL BUSINESSES (Admin)
// ======================
router.get(
  '/admin/all',
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const businesses = await Business.find({})
        .populate('ownerId', 'username email avatar')
        .sort({ createdAt: -1 })
        .lean();

      res.json({ businesses });
    } catch (error) {
      console.error('Error fetching all businesses:', error);
      res.status(500).json({ error: 'Failed to fetch businesses' });
    }
  }
);

// ======================
// GET BUSINESSES FOR MAP
// ======================
router.get(
  '/map/locations',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const businesses = await Business.find({
        status: 'active',
        isActive: true,
        'location.coordinates.lat': { $exists: true, $ne: null },
        'location.coordinates.lng': { $exists: true, $ne: null },
      })
        .select('name slug type tagline description location images stats isVerified transport')
        .lean();

      const locations = businesses.map((b) => ({
        id: b._id.toString(),
        name: b.name,
        type: b.type,
        tagline: b.tagline,
        description: b.description,
        lat: b.location.coordinates?.lat,
        lng: b.location.coordinates?.lng,
        address: b.location.address,
        image: b.images && b.images.length > 0 ? b.images[0] : null,
        rating: b.stats?.rating || 0,
        reviewCount: b.stats?.reviewCount || 0,
        isVerified: b.isVerified,
        transport: b.transport || null,
      }));

      res.json({ locations });
    } catch (error) {
      console.error('Error fetching business map locations:', error);
      res.status(500).json({ error: 'Failed to fetch business locations' });
    }
  }
);

// ======================
// DISCOVER BUSINESSES FROM OSM
// ======================
router.get(
  '/osm/discover',
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      // Iligan City bounds
      const bounds = {
        south: 8.10,
        west: 124.10,
        north: 8.30,
        east: 124.35,
      };

      // Query for business-related nodes in Iligan
      const query = `
        [out:json][timeout:30];
        (
          node["amenity"~"restaurant|cafe|fast_food|bar|pub|food_court"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["tourism"~"hotel|motel|hostel|guest_house|apartment|resort"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["shop"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          way["amenity"~"restaurant|cafe|fast_food"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          way["tourism"~"hotel|motel|hostel|guest_house|resort"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          way["shop"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        );
        out center body;
      `;

      const endpoints = [
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass-api.de/api/interpreter',
      ];

      let osmData: any = null;

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ data: query }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            osmData = await response.json();
            break;
          }
        } catch (err) {
          console.warn(`OSM endpoint ${endpoint} failed`);
        }
      }

      if (!osmData?.elements) {
        res.status(503).json({ error: 'Unable to fetch OSM data' });
        return;
      }

      // Get existing business names to filter out duplicates
      const existingBusinesses = await Business.find({}, { name: 1 }).lean();
      const existingNames = new Set(
        existingBusinesses.map((b) => b.name.toLowerCase().trim())
      );

      // Map OSM elements to business-like objects
      const osmPlaces = osmData.elements
        .filter((el: any) => el.tags?.name)
        .map((el: any) => {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;

          // Determine business type based on tags
          let type = 'shop';
          let displayType = 'Shop';
          
          if (el.tags?.amenity) {
            const amenity = el.tags.amenity;
            if (['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'food_court'].includes(amenity)) {
              type = 'restaurant';
              displayType = amenity === 'cafe' ? 'Cafe' : amenity === 'fast_food' ? 'Fast Food' : 'Restaurant';
            }
          }
          
          if (el.tags?.tourism) {
            const tourism = el.tags.tourism;
            if (['hotel', 'motel', 'hostel', 'guest_house', 'apartment', 'resort'].includes(tourism)) {
              type = 'accommodation';
              displayType = tourism === 'hotel' ? 'Hotel' : tourism === 'resort' ? 'Resort' : 'Accommodation';
            }
          }
          
          if (el.tags?.shop) {
            type = 'shop';
            displayType = 'Shop';
          }

          return {
            osmId: `osm-${el.type}-${el.id}`,
            name: el.tags.name,
            type,
            displayType,
            lat,
            lng,
            description: el.tags.description || el.tags['description:en'] || '',
            address: el.tags['addr:full'] || el.tags['addr:street'] || '',
            phone: el.tags.phone || el.tags['contact:phone'] || '',
            website: el.tags.website || el.tags['contact:website'] || '',
            tags: el.tags,
            alreadyExists: existingNames.has(el.tags.name.toLowerCase().trim()),
          };
        })
        .filter((p: any) => p.lat && p.lng);

      res.json({
        places: osmPlaces,
        total: osmPlaces.length,
        newPlaces: osmPlaces.filter((p: any) => !p.alreadyExists).length,
      });
    } catch (error) {
      console.error('Error discovering OSM businesses:', error);
      res.status(500).json({ error: 'Failed to discover businesses from OSM' });
    }
  }
);

// ======================
// IMPORT OSM PLACE AS BUSINESS
// ======================
router.post(
  '/osm/import',
  authenticate,
  requireAdmin,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { osmId, name, type, lat, lng, description, address, phone, website } = req.body;

      if (!osmId || !name || !type || !lat || !lng) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Check if already exists
      const existing = await Business.findOne({
        $or: [
          { 'location.osmId': osmId },
          { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        ],
      });

      if (existing) {
        res.status(409).json({ error: 'Business already exists' });
        return;
      }

      const slug = generateSlug(name);
      
      const business = new Business({
        ownerId: req.user!._id,
        name,
        slug,
        type,
        description: description || `${name} - ${type} in Iligan City`,
        location: {
          address: address || 'Iligan City, Lanao del Norte',
          coordinates: { lat, lng },
          osmId,
        },
        contact: {
          phone: phone || '',
          website: website || '',
        },
        images: [],
        isVerified: false,
        isActive: true,
        status: 'active',
        stats: { rating: 0, reviewCount: 0 },
      });

      await business.save();

      res.status(201).json({ business });
    } catch (error) {
      console.error('Error importing OSM business:', error);
      res.status(500).json({ error: 'Failed to import business' });
    }
  })
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
