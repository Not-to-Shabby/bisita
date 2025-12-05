import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import Attraction from '../models/Attraction.js';
import { authenticate, optionalAuth, AuthRequest, asHandler } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { fetchOsmCoordinates } from '../utils/osmCoordinates.js';

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

const hasCoordinates = (coords?: { lat?: number; lng?: number } | null): coords is { lat: number; lng: number } => {
  return typeof coords?.lat === 'number' && typeof coords?.lng === 'number';
};

const normalizeLocationPayload = (payload: any) => {
  if (!payload?.location) {
    return;
  }

  if (!payload.location.manualCoordinates && hasCoordinates(payload.location.coordinates)) {
    payload.location.manualCoordinates = {
      lat: payload.location.coordinates.lat,
      lng: payload.location.coordinates.lng,
    };
  }

  if (!payload.location.coordinates && hasCoordinates(payload.location.manualCoordinates)) {
    payload.location.coordinates = {
      lat: payload.location.manualCoordinates.lat,
      lng: payload.location.manualCoordinates.lng,
    };
  }
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
          location: 1,
          images: { $slice: 1 },
          category: 1,
          transport: 1,
          useOsmCoordinates: 1,
          stats: 1,
        }
      ).lean();

      // Transform to match MapLocation interface expected by frontend
      const locations = attractions
        .map((a) => {
          const manualCoordinates = a.location?.manualCoordinates || a.location?.coordinates;
          const osmCoordinates = a.location?.osmCoordinates;

          let sourceCoordinates = manualCoordinates;
          let coordinateSource: 'manual' | 'osm' | 'fallback' = 'manual';

          if (a.useOsmCoordinates && osmCoordinates?.lat && osmCoordinates?.lng) {
            sourceCoordinates = osmCoordinates;
            coordinateSource = 'osm';
          } else if (!sourceCoordinates?.lat || !sourceCoordinates?.lng) {
            if (osmCoordinates?.lat && osmCoordinates?.lng) {
              sourceCoordinates = osmCoordinates;
              coordinateSource = a.useOsmCoordinates ? 'osm' : 'fallback';
            } else if (a.location?.coordinates?.lat && a.location?.coordinates?.lng) {
              sourceCoordinates = a.location.coordinates;
              coordinateSource = 'fallback';
            }
          }

          if (!sourceCoordinates?.lat || !sourceCoordinates?.lng) {
            return null;
          }

          // Transform transport object to array format expected by frontend
          const transportArray = a.transport
            ? [
                {
                  mode: a.transport.vehicle || 'Jeepney',
                  description: a.transport.route || '',
                  fare: a.transport.fares?.regular || '',
                  fareDiscounted: a.transport.fares?.discounted || '',
                  fareHabal: a.transport.fares?.habal || '',
                  terminal: '',
                  travelTime: a.transport.duration || '',
                  tips: a.transport.note || '',
                  segments: a.transport.segments || [],
                },
              ]
            : [];

          return {
            id: a.legacyId || a._id?.toString() || '',
            name: a.name,
            category: a.category,
            lat: sourceCoordinates.lat,
            lng: sourceCoordinates.lng,
            description: a.location?.address || '',
            address: a.location?.address || '',
            transport: transportArray,
            useOsmCoordinates: a.useOsmCoordinates ?? false,
            coordinateSource,
            manualCoordinates: manualCoordinates || null,
            osmCoordinates: osmCoordinates || null,
            stats: a.stats,
          };
        })
        .filter(Boolean);

      res.json({ locations });
    } catch (error) {
      console.error('Error fetching map locations:', error);
      res.status(500).json({ error: 'Failed to fetch locations' });
    }
  }
);

// ======================
// FETCH OSM PLACES FOR IMPORT
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

      // Query for tourism-related nodes in Iligan
      const query = `
        [out:json][timeout:30];
        (
          node["tourism"~"attraction|viewpoint|museum|artwork|gallery"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["natural"~"waterfall|spring|cave|peak"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["leisure"~"park|garden|nature_reserve"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["amenity"~"place_of_worship"][religion](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          node["historic"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          way["tourism"~"attraction|viewpoint|museum"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          way["natural"~"waterfall|spring"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          way["leisure"~"park|garden|nature_reserve"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
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

      // Get existing attraction names to filter out duplicates
      const existingAttractions = await Attraction.find({}, { name: 1 }).lean();
      const existingNames = new Set(
        existingAttractions.map((a) => a.name.toLowerCase().trim())
      );

      // Map OSM elements to attraction-like objects
      const osmPlaces = osmData.elements
        .filter((el: any) => el.tags?.name)
        .map((el: any) => {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;

          // Determine category based on tags - use database enum values
          let category = 'other';
          let displayCategory = 'Other';
          if (el.tags?.natural === 'waterfall') {
            category = 'waterfall';
            displayCategory = 'Waterfall';
          } else if (el.tags?.natural === 'spring') {
            category = 'spring';
            displayCategory = 'Spring';
          } else if (el.tags?.natural === 'cave' || el.tags?.natural === 'peak') {
            category = 'viewpoint';
            displayCategory = 'Nature';
          } else if (el.tags?.historic) {
            category = 'heritage';
            displayCategory = 'Heritage';
          } else if (el.tags?.leisure === 'park' || el.tags?.leisure === 'nature_reserve' || el.tags?.leisure === 'garden') {
            category = 'park';
            displayCategory = 'Park';
          } else if (el.tags?.tourism === 'museum') {
            category = 'museum';
            displayCategory = 'Museum';
          } else if (el.tags?.tourism === 'viewpoint') {
            category = 'viewpoint';
            displayCategory = 'Viewpoint';
          } else if (el.tags?.amenity === 'place_of_worship') {
            category = 'religious';
            displayCategory = 'Religious';
          } else if (el.tags?.tourism === 'attraction') {
            category = 'other';
            displayCategory = 'Attraction';
          }

          return {
            osmId: `osm-${el.type}-${el.id}`,
            name: el.tags.name,
            category,
            displayCategory,
            lat,
            lng,
            description: el.tags.description || el.tags['description:en'] || '',
            address: el.tags['addr:full'] || el.tags['addr:street'] || '',
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
      console.error('Error discovering OSM places:', error);
      res.status(500).json({ error: 'Failed to discover places from OSM' });
    }
  }
);

// ======================
// IMPORT OSM PLACE AS ATTRACTION
// ======================
router.post(
  '/osm/import',
  authenticate,
  requireAdmin,
  [
    body('osmId').trim().notEmpty(),
    body('name').trim().notEmpty(),
    body('category').trim().notEmpty(),
    body('lat').isFloat({ min: -90, max: 90 }),
    body('lng').isFloat({ min: -180, max: 180 }),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { osmId, name, category, lat, lng, description, address } = req.body;

    // Check if already exists
    const existing = await Attraction.findOne({
      $or: [
        { 'location.osmCoordinates.sourceId': osmId },
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
      ],
    });

    if (existing) {
      res.status(409).json({ error: 'Attraction already exists' });
      return;
    }

    // Generate slug
    let slug = generateSlug(name);
    const existingSlug = await Attraction.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const attraction = await Attraction.create({
      name,
      slug,
      category,
      description: description || `A ${category.toLowerCase()} in Iligan City discovered from OpenStreetMap.`,
      location: {
        address: address || 'Iligan City, Lanao del Norte',
        barangay: '',
        coordinates: { lat, lng },
        manualCoordinates: { lat, lng },
        osmCoordinates: {
          lat,
          lng,
          fetchedAt: new Date(),
          sourceId: osmId,
        },
      },
      useOsmCoordinates: true,
      status: 'active',
      isActive: true,
      isFeatured: false,
    });

    res.status(201).json({ attraction });
  })
);

// ======================
// BULK SYNC FROM OSM
// ======================
router.post(
  '/sync-osm-coordinates',
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const attractions = await Attraction.find({ status: 'active' });
      let synced = 0;
      let failed = 0;
      let reused = 0;
      let fetched = 0;

      for (const attraction of attractions) {
        const existingOsm = attraction.location?.osmCoordinates;
        if (hasCoordinates(existingOsm)) {
          attraction.useOsmCoordinates = true;
          attraction.location.coordinates = {
            lat: existingOsm!.lat,
            lng: existingOsm!.lng,
          };
          await attraction.save();
          synced += 1;
          reused += 1;
          continue;
        }

        const osmResult = await fetchOsmCoordinates(attraction.name);
        if (!osmResult) {
          failed += 1;
          continue;
        }

        attraction.location.osmCoordinates = {
          lat: osmResult.lat,
          lng: osmResult.lng,
          fetchedAt: new Date(),
          sourceId: osmResult.sourceId,
        };
        attraction.useOsmCoordinates = true;
        attraction.location.coordinates = {
          lat: osmResult.lat,
          lng: osmResult.lng,
        };

        await attraction.save();
        synced += 1;
        fetched += 1;
      }

      res.json({
        message: 'OSM coordinates refreshed',
        synced,
        fetched,
        reused,
        failed,
      });
    } catch (error) {
      console.error('Error syncing OSM coordinates:', error);
      res.status(500).json({ error: 'Failed to sync coordinates' });
    }
  }
);

// ======================
// BULK USE DATABASE COORDINATES
// ======================
router.post(
  '/use-db-coordinates',
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const attractions = await Attraction.find({});
      let updated = 0;

      for (const attraction of attractions) {
        const manual =
          attraction.location?.manualCoordinates || attraction.location?.coordinates;

        if (!hasCoordinates(manual)) {
          continue;
        }

        attraction.location.manualCoordinates = {
          lat: manual.lat,
          lng: manual.lng,
        };
        attraction.location.coordinates = {
          lat: manual.lat,
          lng: manual.lng,
        };
        attraction.useOsmCoordinates = false;

        await attraction.save();
        updated += 1;
      }

      res.json({
        message: 'All attractions reverted to manual coordinates',
        updated,
      });
    } catch (error) {
      console.error('Error setting database coordinates:', error);
      res.status(500).json({ error: 'Failed to update coordinates' });
    }
  }
);

// ======================
// SYNC SINGLE ATTRACTION FROM OSM
// ======================
router.post(
  '/:id/sync-osm',
  authenticate,
  requireAdmin,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const activate = req.body?.activate ?? false;

    const attraction = await Attraction.findById(id);
    if (!attraction) {
      res.status(404).json({ error: 'Attraction not found' });
      return;
    }

    const osmResult = await fetchOsmCoordinates(attraction.name);
    if (!osmResult) {
      res.status(404).json({ error: 'No matching OSM coordinates found' });
      return;
    }

    attraction.location.osmCoordinates = {
      lat: osmResult.lat,
      lng: osmResult.lng,
      fetchedAt: new Date(),
      sourceId: osmResult.sourceId,
    };

    if (activate || attraction.useOsmCoordinates) {
      attraction.useOsmCoordinates = true;
      attraction.location.coordinates = {
        lat: osmResult.lat,
        lng: osmResult.lng,
      };
    }

    await attraction.save();

    res.json({ attraction });
  })
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
      normalizeLocationPayload(req.body);

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
// GET SINGLE ATTRACTION (must come after specific routes)
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

      normalizeLocationPayload(req.body);

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
