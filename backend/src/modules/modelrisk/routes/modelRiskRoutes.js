import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { ROLES } from '../../../security/roles.js';
import { list } from '../controller/modelRiskController.js';

const router = Router();
router.get('/', requireAuth, requireRole(ROLES.MODEL_RISK, ROLES.CREDIT_POLICY, ROLES.COMPLIANCE, ROLES.SYSTEM_ADMIN, ROLES.AUDITOR), list);

export default router;
