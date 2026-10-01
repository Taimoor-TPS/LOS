import { Router } from 'express';
import { requireAuth, requirePermission, requireCustomer, requireStaffOrCustomer } from '../../../security/auth.js';
import {
  accept, addNote, completeStep, create, decide, disburse, getOne, grantConsent, kfs, list, override, secondApproval, signConfirm, signStart, verify, vote,
} from '../controller/applicationController.js';

const router = Router();
router.use(requireAuth);
router.post('/', requirePermission('application:create'), create);
router.get('/', requirePermission('application:view'), list);
router.get('/:id', requireStaffOrCustomer('application:view'), getOne);
router.post('/:id/consents', requireStaffOrCustomer('application:edit'), grantConsent);
router.post('/:id/verify', requirePermission('application:edit'), verify);
router.post('/:id/decide', requirePermission('application:approve'), decide);
router.get('/:id/kfs', requireStaffOrCustomer('application:view'), kfs);
router.post('/:id/accept', requireCustomer, accept);
router.post('/:id/sign/start', requireCustomer, signStart);
router.post('/:id/sign/confirm', requireCustomer, signConfirm);
router.post('/:id/notes', requirePermission('application:edit'), addNote);
router.post('/:id/override', requirePermission('application:override_rule'), override);
router.post('/:id/second-approval', requirePermission('application:approve'), secondApproval);
router.post('/:id/votes', requirePermission('application:approve'), vote);
router.post('/:id/steps/:stepCode', requirePermission('disbursement:initiate'), completeStep);
router.post('/:id/disburse', requirePermission('disbursement:authorise'), disburse);
export default router;
