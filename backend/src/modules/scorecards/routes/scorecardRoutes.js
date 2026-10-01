import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { CHECKER_ROLES, ROLES } from '../../../security/roles.js';
import { approve, create, list, simulate, submit } from '../controller/scorecardController.js';

const router = Router();
router.use(requireAuth);
const readers = [ROLES.CREDIT_POLICY, ROLES.MODEL_RISK, ROLES.COMPLIANCE, ROLES.SYSTEM_ADMIN, ROLES.UNDERWRITER, ROLES.CREDIT_OFFICER, ROLES.AUDITOR];
router.get('/', requireRole(...readers), list);
router.post('/', requireRole(ROLES.CREDIT_POLICY, ROLES.MODEL_RISK, ROLES.SYSTEM_ADMIN), create);
router.post('/:id/submit', requireRole(ROLES.CREDIT_POLICY, ROLES.MODEL_RISK, ROLES.SYSTEM_ADMIN), submit);
router.post('/:id/approve', requireRole(...CHECKER_ROLES), approve);
router.post('/:id/simulate', requireRole(...readers), simulate);

export default router;
