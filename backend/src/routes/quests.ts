import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import mongoose from 'mongoose';
import Quest from '../models/Quest.js';
import UserQuest from '../models/UserQuest.js';
import { authenticate, AuthRequest, asHandler } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import GameSettings from '../models/GameSettings.js';

import User from '../models/User.js';

const router = Router();

// ======================
// HELPER: Generate unique slug
// ======================
const generateUniqueSlug = async (title: string, excludeId?: string): Promise<string> => {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query: any = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await Quest.findOne(query);
    if (!existing) break;
    slug = `${baseSlug}-${++counter}`;
  }

  return slug;
};

// ======================
// ADMIN: GET ALL QUESTS (including inactive)
// ======================
router.get(
  '/admin/all',
  authenticate,
  requireAdmin,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const quests = await Quest.find()
        .populate('tasks.locationId', 'name')
        .sort({ createdAt: -1 });

      res.json({ quests });
    } catch (error) {
      console.error('Error fetching all quests:', error);
      res.status(500).json({ error: 'Failed to fetch quests' });
    }
  })
);

// ======================
// ADMIN: CREATE QUEST
// ======================
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('title').isString().notEmpty().trim(),
    body('description').isString().notEmpty(),
    body('image').isString().notEmpty(),
    body('badgeImage').isString().notEmpty(),
    body('reward').isString().notEmpty(),
    body('totalExp').optional().isNumeric(),
    body('isActive').optional().isBoolean(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('tasks').isArray({ min: 1 }),
    body('tasks.*.title').isString().notEmpty(),
    body('tasks.*.description').isString().notEmpty(),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        title,
        slug: providedSlug,
        description,
        image,
        badgeImage,
        tasks,
        reward,
        totalExp = 100,
        isActive = true,
        startDate,
        endDate,
      } = req.body;

      // Generate unique slug
      const slug = providedSlug
        ? await generateUniqueSlug(providedSlug)
        : await generateUniqueSlug(title);

      const quest = await Quest.create({
        title,
        slug,
        description,
        image,
        badgeImage,
        tasks,
        reward,
        totalExp,
        isActive,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      res.status(201).json({ quest, slug });
    } catch (error) {
      console.error('Error creating quest:', error);
      res.status(500).json({ error: 'Failed to create quest' });
    }
  })
);

// ======================
// ADMIN: UPDATE QUEST
// ======================
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isMongoId(),
    body('title').optional().isString().notEmpty().trim(),
    body('description').optional().isString().notEmpty(),
    body('image').optional().isString().notEmpty(),
    body('badgeImage').optional().isString().notEmpty(),
    body('reward').optional().isString().notEmpty(),
    body('totalExp').optional().isNumeric(),
    body('isActive').optional().isBoolean(),
    body('startDate').optional(),
    body('endDate').optional(),
    body('tasks').optional().isArray(),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const quest = await Quest.findById(id);
      if (!quest) {
        res.status(404).json({ error: 'Quest not found' });
        return;
      }

      const {
        title,
        slug: providedSlug,
        description,
        image,
        badgeImage,
        tasks,
        reward,
        totalExp,
        isActive,
        startDate,
        endDate,
      } = req.body;

      // If title changed and no custom slug, regenerate slug
      let newSlug = quest.slug;
      if (providedSlug && providedSlug !== quest.slug) {
        newSlug = await generateUniqueSlug(providedSlug, id);
      } else if (title && title !== quest.title && !providedSlug) {
        newSlug = await generateUniqueSlug(title, id);
      }

      // Update fields
      if (title !== undefined) quest.title = title;
      quest.slug = newSlug;
      if (description !== undefined) quest.description = description;
      if (image !== undefined) quest.image = image;
      if (badgeImage !== undefined) quest.badgeImage = badgeImage;
      if (tasks !== undefined) quest.tasks = tasks;
      if (reward !== undefined) quest.reward = reward;
      if (totalExp !== undefined) quest.totalExp = totalExp;
      if (isActive !== undefined) quest.isActive = isActive;
      if (startDate !== undefined) quest.startDate = startDate ? new Date(startDate) : undefined;
      if (endDate !== undefined) quest.endDate = endDate ? new Date(endDate) : undefined;

      await quest.save();

      res.json({ quest });
    } catch (error) {
      console.error('Error updating quest:', error);
      res.status(500).json({ error: 'Failed to update quest' });
    }
  })
);

// ======================
// ADMIN: DELETE QUEST
// ======================
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isMongoId()],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const quest = await Quest.findByIdAndDelete(id);
      if (!quest) {
        res.status(404).json({ error: 'Quest not found' });
        return;
      }

      // Also delete all user progress for this quest
      await UserQuest.deleteMany({ questId: id });

      res.json({ message: 'Quest deleted successfully' });
    } catch (error) {
      console.error('Error deleting quest:', error);
      res.status(500).json({ error: 'Failed to delete quest' });
    }
  })
);

// ======================
// GET ALL QUESTS
// ======================
router.get(
  '/',
  asHandler(async (req: any, res: Response): Promise<void> => {
    try {
      const quests = await Quest.find({ isActive: true })
        .select('title slug description image badgeImage totalExp reward tasks')
        .sort({ createdAt: -1 });

      res.json({ quests });
    } catch (error) {
      console.error('Error fetching quests:', error);
      res.status(500).json({ error: 'Failed to fetch quests' });
    }
  })
);

// ======================
// GET MY QUEST PROGRESS
// ======================
router.get(
  '/my-progress',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userQuests = await UserQuest.find({ userId: req.user!._id })
        .populate('questId', 'title slug totalExp reward badgeImage');

      res.json({ userQuests });
    } catch (error) {
      console.error('Error fetching user quests:', error);
      res.status(500).json({ error: 'Failed to fetch quest progress' });
    }
  })
);

// ======================
// GET SINGLE QUEST DETAILS
// ======================
router.get(
  '/:id',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const quest = await Quest.findById(id);
      if (!quest) {
        res.status(404).json({ error: 'Quest not found' });
        return;
      }

      // Get user's progress
      const userQuest = await UserQuest.findOne({
        userId: req.user!._id,
        questId: quest._id
      });

      res.json({ quest, userQuest });
    } catch (error) {
      console.error('Error fetching quest details:', error);
      res.status(500).json({ error: 'Failed to fetch quest details' });
    }
  })
);

// ======================
// START A QUEST
// ======================
router.post(
  '/:id/start',
  authenticate,
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const quest = await Quest.findById(id);
      if (!quest) {
        res.status(404).json({ error: 'Quest not found' });
        return;
      }

      // Check if already started
      let userQuest = await UserQuest.findOne({
        userId: req.user!._id,
        questId: quest._id
      });

      if (userQuest) {
        if (userQuest.status === 'dropped') {
          // Restart
          userQuest.status = 'active';
          userQuest.completedTaskIds = [];
          userQuest.startedAt = new Date();
          await userQuest.save();
        }
        // If active or completed, just return it
      } else {
        // Create new
        userQuest = await UserQuest.create({
          userId: req.user!._id,
          questId: quest._id,
          status: 'active',
          completedTaskIds: []
        });
      }

      res.json({ userQuest });
    } catch (error) {
      console.error('Error starting quest:', error);
      res.status(500).json({ error: 'Failed to start quest' });
    }
  })
);

// ======================
// SCAN QR / COMPLETE TASK
// ======================
router.post(
  '/scan',
  authenticate,
  [
    body('qrData').isString().notEmpty(),
    body('location').optional(), // GPS coords for verification if needed
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { qrData } = req.body;

      // 1. Find which quest task this QR code belongs to
      const quests = await Quest.find({ isActive: true });
      
      let matchedQuest = null;
      let matchedTask = null;

      for (const q of quests) {
        const task = q.tasks.find(t => t.qrCodeData === qrData);
        if (task) {
          matchedQuest = q;
          matchedTask = task;
          break;
        }
      }

      // If no quest task found, check for generic GameSettings rules
      if (!matchedQuest || !matchedTask) {
        const settings = await GameSettings.findOne() || await GameSettings.create({});
        const navigationRule = settings.navigationRules.find(rule => rule.enabled !== false && qrData.includes(rule.pattern));

        if (navigationRule) {
          // It's a valid generic scan (e.g. "ATTRACTION:...")
          const xpAwarded = navigationRule.rewardXp ?? settings.xpPerScan ?? 0;
          let nextRoute = navigationRule.targetRoute || settings.defaultNextRoute;
          const confetti = navigationRule.confetti ?? settings.confettiEnabled ?? false;

          // Dynamic route replacement (e.g. ATTRACTION:123 -> /attraction/123)
          if (nextRoute && nextRoute.includes(':id') && qrData.includes(':')) {
            const parts = qrData.split(':');
            if (parts.length >= 2) {
              const id = parts[parts.length - 1]; // Assume last part is ID
              nextRoute = nextRoute.replace(':id', id);
            }
          }

          // Award XP to user
          if (xpAwarded > 0) {
            await User.findByIdAndUpdate(req.user!._id, {
              $inc: { 'stats.xp': xpAwarded }
            });
          }

          res.json({
            message: navigationRule.note || 'Location discovered!',
            isQuestComplete: false,
            quest: null,
            task: null,
            progress: null,
            reward: null,
            xpAwarded,
            nextRoute,
            confetti,
          });
          return;
        }

        res.status(404).json({ error: 'Invalid QR Code. No matching quest or location found.' });
        return;
      }

      // 2. Check if user has started this quest
      let userQuest = await UserQuest.findOne({
        userId: req.user!._id,
        questId: matchedQuest._id
      });

      if (!userQuest) {
        // Auto-start quest? Or require manual start?
        // Let's auto-start for better UX
        userQuest = await UserQuest.create({
          userId: req.user!._id,
          questId: matchedQuest._id,
          status: 'active',
          completedTaskIds: []
        });
      }

      // 3. Check if task already completed
      // We use the task's _id (if it has one) or title as identifier
      // Mongoose subdocuments have _ids by default
      const taskId = (matchedTask as any)._id.toString();

      if (userQuest.completedTaskIds.includes(taskId)) {
        res.json({ 
          message: 'Task already completed!',
          quest: matchedQuest,
          task: matchedTask,
          progress: userQuest
        });
        return;
      }

      // 4. Mark task as completed
      userQuest.completedTaskIds.push(taskId);
      
      // 5. Check if quest is fully completed
      const allTaskIds = matchedQuest.tasks.map(t => (t as any)._id.toString());
      const isQuestComplete = allTaskIds.every(id => userQuest!.completedTaskIds.includes(id));

      if (isQuestComplete) {
        userQuest.status = 'completed';
        userQuest.completedAt = new Date();
        
        // Award EXP to user (assuming User model has stats.exp or similar, 
        // but for now just updating the quest record)
        // TODO: Update user stats
      }

      await userQuest.save();

      const settings = await GameSettings.findOne() || await GameSettings.create({});
      const navigationRule = settings.navigationRules.find(rule => rule.enabled !== false && qrData.includes(rule.pattern));

      const xpAwarded = navigationRule?.rewardXp ?? settings.xpPerScan ?? 0;
      const nextRoute = navigationRule?.targetRoute || settings.defaultNextRoute || (matchedQuest ? `/quest/${matchedQuest._id.toString()}` : null);
      const confetti = navigationRule?.confetti ?? settings.confettiEnabled ?? false;

      // Award XP to user
      if (xpAwarded > 0) {
        await User.findByIdAndUpdate(req.user!._id, {
          $inc: { 'stats.xp': xpAwarded }
        });
      }

      res.json({
        message: 'Task completed!',
        isQuestComplete,
        quest: matchedQuest,
        task: matchedTask,
        progress: userQuest,
        reward: isQuestComplete ? matchedQuest.reward : null,
        xpAwarded,
        nextRoute,
        confetti,
      });

    } catch (error) {
      console.error('Error processing QR scan:', error);
      res.status(500).json({ error: 'Failed to process QR code' });
    }
  })
);

export default router;
