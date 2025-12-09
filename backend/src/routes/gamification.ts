import { Router, Response } from 'express';
import { body } from 'express-validator';
import GameSettings, { IGameSettings, INavigationRule } from '../models/GameSettings.js';
import { authenticate, asHandler, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';

const router = Router();

const getOrCreateSettings = async (): Promise<IGameSettings> => {
  let settings = await GameSettings.findOne();
  if (!settings) {
    settings = await GameSettings.create({});
  }
  return settings;
};

router.get(
  '/settings',
  authenticate,
  requireAdmin,
  asHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
    const settings = await getOrCreateSettings();
    res.json({ settings });
  })
);

router.put(
  '/settings',
  authenticate,
  requireAdmin,
  [
    body('confettiEnabled').optional().isBoolean(),
    body('xpPerScan').optional().isNumeric(),
    body('cooldownSeconds').optional().isNumeric(),
    body('defaultNextRoute').optional().isString(),
    body('navigationRules').optional().isArray(),
  ],
  asHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const settings = await getOrCreateSettings();

    const { confettiEnabled, xpPerScan, cooldownSeconds, defaultNextRoute, navigationRules } = req.body;

    if (confettiEnabled !== undefined) settings.confettiEnabled = Boolean(confettiEnabled);
    if (xpPerScan !== undefined) settings.xpPerScan = Number(xpPerScan);
    if (cooldownSeconds !== undefined) settings.cooldownSeconds = Number(cooldownSeconds);
    if (defaultNextRoute !== undefined) settings.defaultNextRoute = defaultNextRoute;

    if (Array.isArray(navigationRules)) {
      settings.navigationRules = navigationRules
        .map((rule: Partial<INavigationRule>) => ({
          pattern: rule.pattern || '',
          targetRoute: rule.targetRoute || '',
          rewardXp: rule.rewardXp ?? 0,
          confetti: rule.confetti,
          note: rule.note,
          enabled: rule.enabled !== false,
        }))
        .filter(rule => rule.pattern && rule.targetRoute);
    }

    await settings.save();
    res.json({ settings });
  })
);

export default router;
