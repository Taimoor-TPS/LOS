import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { CASE_READ_ROLES, ROLES } from '../../../security/roles.js';
import { commandCenter } from '../controller/reportingController.js';

const router = Router();
router.get('/command-center', requireAuth, requireRole(...CASE_READ_ROLES, ROLES.MARKETING, ROLES.CREDIT_POLICY, ROLES.MODEL_RISK), commandCenter);

export default router;
