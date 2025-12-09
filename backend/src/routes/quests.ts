import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import mongoose from 'mongoose';
import Quest from '../models/Quest.js';
import UserQuest from '../models/UserQuest.js';
import { authenticate, AuthRequest, asHandler } from '../middleware/auth.js';
import GameSettings from '../models/GameSettings.js';

const router = Router();

// ======================
// GET ALL QUESTS
// ======================
router.get(
  '/',
  asHandler(async (req: any, res: Response): Promise<void> => {
    try {
      const quests = await Quest.find({ isActive: true })
        .select('title slug description image badgeImage totalExp reward')
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
      // This is a bit inefficient if we have many quests, but fine for now.
      // Ideally, QR data should contain the questId or taskId, e.g., "QUEST:questId:taskId"
      // But if it's just a location string, we search all active quests.
      
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

      if (!matchedQuest || !matchedTask) {
        res.status(404).json({ error: 'Invalid QR Code. No matching quest found.' });
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
