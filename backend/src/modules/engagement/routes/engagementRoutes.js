import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { ROLES } from '../../../security/roles.js';
import { createCampaign, listCampaigns, listOffers, myOffers, runCampaign, viewOffer } from '../controller/engagementController.js';

const router = Router();
router.use(requireAuth);
router.get('/offers/mine', requireRole(ROLES.CUSTOMER), myOffers);
router.post('/offers/:id/view', requireRole(ROLES.CUSTOMER), viewOffer);
router.get('/offers', requireRole(ROLES.MARKETING, ROLES.SYSTEM_ADMIN, ROLES.CREDIT_POLICY), listOffers);
router.get('/campaigns', requireRole(ROLES.MARKETING, ROLES.SYSTEM_ADMIN, ROLES.CREDIT_POLICY, ROLES.AUDITOR), listCampaigns);
router.post('/campaigns', requireRole(ROLES.MARKETING, ROLES.SYSTEM_ADMIN), createCampaign);
router.post('/campaigns/:id/run', requireRole(ROLES.MARKETING, ROLES.SYSTEM_ADMIN), runCampaign);

export default router;
