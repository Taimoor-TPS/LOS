import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { CHECKER_ROLES, ROLES } from '../../../security/roles.js';
import { approve, create, list, simulate, submit } from '../controller/ruleController.js';

const router = Router();
router.use(requireAuth);
const readers = [ROLES.CREDIT_POLICY, ROLES.COMPLIANCE, ROLES.SYSTEM_ADMIN, ROLES.UNDERWRITER, ROLES.MODEL_RISK, ROLES.AUDITOR, ROLES.CREDIT_OFFICER];
router.get('/', requireRole(...readers), list);
router.post('/', requireRole(ROLES.CREDIT_POLICY, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE), create);
router.post('/:id/submit', requireRole(ROLES.CREDIT_POLICY, ROLES.SYSTEM_ADMIN, ROLES.COMPLIANCE), submit);
router.post('/:id/approve', requireRole(...CHECKER_ROLES), approve);
router.post('/:id/simulate', requireRole(...readers), simulate);

export default router;
