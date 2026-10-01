import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { CHECKER_ROLES, ROLES } from '../../../security/roles.js';
import { approve, create, list, reject, resolve, submit } from '../controller/configurationController.js';

const router = Router();
router.use(requireAuth);
const readers = [ROLES.CREDIT_POLICY, ROLES.COMPLIANCE, ROLES.SYSTEM_ADMIN, ROLES.SHARIAH_ADVISOR, ROLES.MODEL_RISK, ROLES.AUDITOR, ROLES.CREDIT_OFFICER];
router.get('/', requireRole(...readers), list);
router.get('/resolve', requireRole(...readers, ROLES.UNDERWRITER), resolve);
router.post('/', requireRole(ROLES.CREDIT_POLICY, ROLES.COMPLIANCE, ROLES.SYSTEM_ADMIN, ROLES.SHARIAH_ADVISOR), create);
router.post('/:id/submit', requireRole(ROLES.CREDIT_POLICY, ROLES.COMPLIANCE, ROLES.SYSTEM_ADMIN, ROLES.SHARIAH_ADVISOR), submit);
router.post('/:id/approve', requireRole(...CHECKER_ROLES), approve);
router.post('/:id/reject', requireRole(...CHECKER_ROLES), reject);

export default router;
