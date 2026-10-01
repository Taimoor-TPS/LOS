import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { ROLES } from '../../../security/roles.js';
import { create, list } from '../controller/schemeController.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.post('/', requireRole(ROLES.CREDIT_POLICY, ROLES.SYSTEM_ADMIN), create);

export default router;
