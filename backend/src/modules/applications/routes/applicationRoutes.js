import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { CASE_READ_ROLES, ROLES } from '../../../security/roles.js';
import {
  accept, addNote, completeStep, create, decide, disburse, getOne, grantConsent, kfs, list, override, secondApproval, signConfirm, signStart, verify, vote,
} from '../controller/applicationController.js';

const router = Router();
router.use(requireAuth);

const originators = [ROLES.CUSTOMER, ROLES.RELATIONSHIP_MANAGER, ROLES.BRANCH_OFFICER, ROLES.DEALER, ROLES.SYSTEM_ADMIN];
const readers = [...CASE_READ_ROLES, ROLES.CUSTOMER, ROLES.MARKETING];
const credit = [ROLES.UNDERWRITER, ROLES.CREDIT_OFFICER, ROLES.SYSTEM_ADMIN];
const committee = [ROLES.CREDIT_COMMITTEE, ROLES.CREDIT_OFFICER, ROLES.SYSTEM_ADMIN];
const ops = [ROLES.OPERATIONS, ROLES.SHARIAH_ADVISOR, ROLES.SYSTEM_ADMIN];

router.post('/', requireRole(...originators), create);
router.get('/', requireRole(...readers), list);
router.get('/:id', requireRole(...readers), getOne);
router.post('/:id/consents', requireRole(...originators), grantConsent);
router.post('/:id/verify', requireRole(...originators, ROLES.OPERATIONS), verify);
router.post('/:id/decide', requireRole(...originators, ROLES.UNDERWRITER, ROLES.CREDIT_OFFICER), decide);
router.get('/:id/kfs', requireRole(...readers), kfs);
router.post('/:id/accept', requireRole(ROLES.CUSTOMER, ROLES.RELATIONSHIP_MANAGER, ROLES.BRANCH_OFFICER), accept);
router.post('/:id/sign/start', requireRole(ROLES.CUSTOMER, ROLES.RELATIONSHIP_MANAGER, ROLES.BRANCH_OFFICER), signStart);
router.post('/:id/sign/confirm', requireRole(ROLES.CUSTOMER, ROLES.RELATIONSHIP_MANAGER, ROLES.BRANCH_OFFICER), signConfirm);
router.post('/:id/notes', requireRole(...credit, ROLES.RELATIONSHIP_MANAGER, ROLES.OPERATIONS, ROLES.SHARIAH_ADVISOR), addNote);
router.post('/:id/override', requireRole(...credit), override);
router.post('/:id/second-approval', requireRole(ROLES.CREDIT_OFFICER, ROLES.CREDIT_COMMITTEE, ROLES.SYSTEM_ADMIN), secondApproval);
router.post('/:id/votes', requireRole(...committee), vote);
router.post('/:id/steps/:stepCode', requireRole(...ops), completeStep);
router.post('/:id/disburse', requireRole(ROLES.OPERATIONS, ROLES.SYSTEM_ADMIN), disburse);

export default router;
