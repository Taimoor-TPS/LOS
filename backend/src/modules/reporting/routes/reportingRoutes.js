import { Router } from 'express';
import { env } from '../../../config/env.js';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { commandCenter } from '../controller/reportingController.js';

const router = Router();
router.use(requireAuth);
router.get('/command-center', (req, res, next) => {
  if (!env.featuresExtended) return res.status(404).json({ code: 'NOT_FOUND', message: 'Not found' });
  return requirePermission('report:view')(req, res, next);
}, commandCenter);
export default router;
