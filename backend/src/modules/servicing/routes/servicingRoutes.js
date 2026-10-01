import { Router } from 'express';
import { requireAuth, requireCustomer, requireStaffOrCustomer } from '../../../security/auth.js';
import { acceptRequest, getOne, mine, requestChange } from '../controller/servicingController.js';

const router = Router();
router.use(requireAuth);
router.get('/loans', requireStaffOrCustomer('loan:view'), mine);
router.get('/loans/:id', requireStaffOrCustomer('loan:view'), getOne);
router.post('/loans/:id/requests', requireStaffOrCustomer('loan:reschedule'), requestChange);
router.post('/loans/:id/requests/:requestId/accept', requireCustomer, acceptRequest);
export default router;
