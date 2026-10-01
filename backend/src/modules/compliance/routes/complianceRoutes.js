import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { ROLES } from '../../../security/roles.js';
import { audit, screening } from '../controller/complianceController.js';

const router = Router();
router.use(requireAuth);
router.get('/audit', requireRole(ROLES.AUDITOR, ROLES.COMPLIANCE, ROLES.SYSTEM_ADMIN), audit);
router.get('/screening', requireRole(ROLES.COMPLIANCE, ROLES.AUDITOR, ROLES.UNDERWRITER, ROLES.SYSTEM_ADMIN), screening);

export default router;
