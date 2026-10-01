import { Router } from 'express';
import { requireAuth, requirePermission, requireCustomer, requireStaffOrCustomer } from '../../../security/auth.js';
import { grantConsent, getOne, list, me, revokeConsent } from '../controller/customerController.js';

const router = Router();
router.use(requireAuth);
router.get('/me', requireCustomer, me);
router.get('/', requirePermission('customer:view'), list);
router.get('/:id', requireStaffOrCustomer('customer:view'), getOne);
router.post('/:id/consents', requireStaffOrCustomer('customer:edit'), grantConsent);
router.post('/:id/consents/revoke', requireStaffOrCustomer('customer:edit'), revokeConsent);
export default router;
