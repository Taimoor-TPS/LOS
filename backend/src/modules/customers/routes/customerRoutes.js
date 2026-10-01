import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { CASE_READ_ROLES, ROLES } from '../../../security/roles.js';
import { getOne, grantConsent, list, me, revokeConsent } from '../controller/customerController.js';

const router = Router();
router.use(requireAuth);
router.get('/me', requireRole(ROLES.CUSTOMER), me);
router.get('/', requireRole(...CASE_READ_ROLES, ROLES.MARKETING, ROLES.DEALER), list);
router.get('/:id', requireRole(...CASE_READ_ROLES, ROLES.CUSTOMER, ROLES.MARKETING), getOne);
router.post('/:id/consents', requireRole(ROLES.CUSTOMER, ROLES.RELATIONSHIP_MANAGER, ROLES.BRANCH_OFFICER, ROLES.DEALER), grantConsent);
router.post('/:id/consents/revoke', requireRole(ROLES.CUSTOMER, ROLES.COMPLIANCE), revokeConsent);

export default router;
