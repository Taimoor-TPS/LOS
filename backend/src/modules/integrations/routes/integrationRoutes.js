import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { CASE_READ_ROLES, ROLES } from '../../../security/roles.js';
import { list } from '../controller/integrationController.js';

const router = Router();
router.get('/', requireAuth, requireRole(...CASE_READ_ROLES, ROLES.SYSTEM_ADMIN), list);

export default router;
