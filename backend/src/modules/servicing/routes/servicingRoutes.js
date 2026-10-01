import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { CASE_READ_ROLES, ROLES } from '../../../security/roles.js';
import { acceptRequest, getOne, mine, requestChange } from '../controller/servicingController.js';

const router = Router();
router.use(requireAuth);
router.get('/loans', requireRole(ROLES.CUSTOMER, ...CASE_READ_ROLES), mine);
router.get('/loans/:id', requireRole(ROLES.CUSTOMER, ...CASE_READ_ROLES), getOne);
router.post('/loans/:id/requests', requireRole(ROLES.CUSTOMER, ROLES.OPERATIONS, ROLES.RELATIONSHIP_MANAGER), requestChange);
router.post('/loans/:id/requests/:requestId/accept', requireRole(ROLES.CUSTOMER, ROLES.OPERATIONS), acceptRequest);

export default router;
