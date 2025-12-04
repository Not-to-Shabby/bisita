import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { cloudinary } from '../config/cloudinary.js';
import Media from '../models/Media.js';
import { authenticate, AuthRequest, asHandler } from '../middleware/auth.js';

const router = Router();

// ======================
// GET SIGNED UPLOAD URL
// ======================
router.post(
  '/sign',
  authenticate,
  [
    body('folder').optional().isString(),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { folder = 'bisita' } = req.body;
      const timestamp = Math.round(Date.now() / 1000);

      const signature = cloudinary.utils.api_sign_request(
        {
          timestamp,
          folder,
          upload_preset: 'bisita_uploads',
        },
        process.env.CLOUDINARY_API_SECRET!
      );

      res.json({
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder,
      });
    } catch (error) {
      console.error('Error generating signature:', error);
      res.status(500).json({ error: 'Failed to generate upload signature' });
    }
  })
);

// ======================
// REGISTER UPLOADED MEDIA
// ======================
router.post(
  '/register',
  authenticate,
  [
    body('url').isURL(),
    body('publicId').notEmpty(),
    body('type').optional().isIn(['image', 'video']),
    body('width').optional().isInt(),
    body('height').optional().isInt(),
    body('size').isInt(),
    body('format').notEmpty(),
    body('associatedWith').optional().isObject(),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const {
        url,
        publicId,
        type = 'image',
        width,
        height,
        size,
        format,
        associatedWith,
      } = req.body;

      // Check if already registered
      const existing = await Media.findOne({ publicId });
      if (existing) {
        res.json({ media: existing });
        return;
      }

      const media = await Media.create({
        uploaderId: req.user!._id,
        url,
        thumbnailUrl: url.replace('/upload/', '/upload/c_thumb,w_200,h_200/'),
        publicId,
        type,
        width,
        height,
        size,
        format,
        associatedWith,
      });

      res.status(201).json({ media });
    } catch (error) {
      console.error('Error registering media:', error);
      res.status(500).json({ error: 'Failed to register media' });
    }
  })
);

// ======================
// DELETE MEDIA
// ======================
router.delete(
  '/:publicId',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { publicId } = req.params;
      const decodedPublicId = decodeURIComponent(publicId);

      const media = await Media.findOne({ publicId: decodedPublicId });
      if (!media) {
        res.status(404).json({ error: 'Media not found' });
        return;
      }

      // Check ownership or admin
      const isOwner = media.uploaderId.toString() === req.user!._id.toString();
      const isAdmin = req.user!.role === 'admin';

      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Delete from Cloudinary
      await cloudinary.uploader.destroy(decodedPublicId);

      // Delete from database
      await media.deleteOne();

      res.json({ message: 'Media deleted successfully' });
    } catch (error) {
      console.error('Error deleting media:', error);
      res.status(500).json({ error: 'Failed to delete media' });
    }
  })
);

export default router;
