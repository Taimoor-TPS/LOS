import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { audit, screening } from '../controller/complianceController.js';

const router = Router();
router.use(requireAuth);
router.get('/audit', requirePermission('audit:view'), audit);
router.get('/screening', requirePermission('application:view'), screening);
export default router;
