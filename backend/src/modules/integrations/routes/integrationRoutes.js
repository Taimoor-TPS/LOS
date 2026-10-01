import { Router } from 'express';
import { env } from '../../../config/env.js';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { list } from '../controller/integrationController.js';

const router = Router();
router.use(requireAuth);
router.get('/', requirePermission('integration:view_logs'), list);
router.use((req, res, next) => {
  if (!env.featuresExtended && req.path !== '/') return res.status(404).json({ code: 'NOT_FOUND', message: 'Not found' });
  next();
});
export default router;
