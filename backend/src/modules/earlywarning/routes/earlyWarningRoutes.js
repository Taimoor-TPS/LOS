import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { ROLES } from '../../../security/roles.js';
import { acknowledge, list } from '../controller/earlyWarningController.js';

const router = Router();
router.use(requireAuth);
const roles = [ROLES.RELATIONSHIP_MANAGER, ROLES.CREDIT_OFFICER, ROLES.OPERATIONS, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE];
router.get('/', requireRole(...roles), list);
router.post('/:id/acknowledge', requireRole(...roles), acknowledge);

export default router;
