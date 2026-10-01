import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { ROLES } from '../../../security/roles.js';
import { list, originate } from '../controller/dealerController.js';

const router = Router();
router.use(requireAuth);
router.get('/', requireRole(ROLES.DEALER, ROLES.OPERATIONS, ROLES.SYSTEM_ADMIN, ROLES.RELATIONSHIP_MANAGER), list);
router.post('/originate', requireRole(ROLES.DEALER, ROLES.SYSTEM_ADMIN), originate);

export default router;
