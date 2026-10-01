import { Router } from 'express';
import { requireAuth, requireRole } from '../../security/auth.js';
import { ROLES, STAFF_ROLES } from '../../security/roles.js';
import {
  getAccounting,
  getCollections,
  getComplaints,
  getDeviations,
  getLoanAccount,
  getLoans,
  getOverview,
  getProvisioning,
  getSearch,
  payLoan,
  postCalculate,
  postCollectionAction,
  postComplaint,
  postDecision,
  postDeviation,
  postEligibility,
  postEod,
  postRetireField,
  postSettlement,
  postSimulate,
  postUsersMode,
  quoteSettlement,
} from './controller.js';

const router = Router();
router.use(requireAuth);

const desk = STAFF_ROLES;

router.get('/overview', requireRole(...desk), getOverview);
router.get('/search', requireRole(...desk), getSearch);
router.get('/loans', requireRole(...desk), getLoans);
router.get('/loans/:accountNo', requireRole(...desk, ROLES.CUSTOMER), getLoanAccount);
router.post('/loans/:accountNo/settlement-quote', requireRole(...desk, ROLES.CUSTOMER), quoteSettlement);
router.post('/payments', requireRole(ROLES.CUSTOMER, ...desk), payLoan);
router.post('/eod', requireRole(...desk), postEod);
router.get('/accounting', requireRole(...desk), getAccounting);
router.get('/provisioning', requireRole(...desk), getProvisioning);
router.get('/collections', requireRole(...desk), getCollections);
router.post('/collections/:caseId/actions', requireRole(...desk), postCollectionAction);
router.post('/collections/:caseId/settlements', requireRole(...desk), postSettlement);
router.post('/access/users', requireRole(...desk), postUsersMode);
router.get('/deviations', requireRole(...desk), getDeviations);
router.post('/deviations/:id/approve', requireRole(...desk), postDeviation);
router.post('/decisions/approve', requireRole(...desk), postDecision);
router.post('/fields/retire', requireRole(...desk), postRetireField);
router.post('/products/simulate', requireRole(...desk), postSimulate);
router.post('/eligibility', requireRole(ROLES.CUSTOMER, ...desk), postEligibility);
router.post('/calculate', requireRole(ROLES.CUSTOMER, ...desk), postCalculate);
router.get('/complaints', requireRole(ROLES.CUSTOMER, ...desk), getComplaints);
router.post('/complaints', requireRole(ROLES.CUSTOMER, ...desk), postComplaint);

export default router;
