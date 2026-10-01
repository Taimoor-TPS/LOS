import { Router } from 'express';
import { requireAuth, requirePermission, requireCustomer } from '../../../security/auth.js';
import { createCampaign, listCampaigns, listOffers, myOffers, runCampaign, viewOffer } from '../controller/engagementController.js';

const router = Router();
router.use(requireAuth);
router.get('/offers/mine', requireCustomer, myOffers);
router.post('/offers/:id/view', requireCustomer, viewOffer);
router.get('/offers', requirePermission('product:view'), listOffers);
router.get('/campaigns', requirePermission('config:view'), listCampaigns);
router.post('/campaigns', requirePermission('config:edit'), createCampaign);
router.post('/campaigns/:id/run', requirePermission('config:publish'), runCampaign);
export default router;
