import { Router } from 'express';
import { requireAuth, requireRole } from '../../../security/auth.js';
import { ROLES } from '../../../security/roles.js';
import { create, getOne, list, quote, update } from '../controller/productController.js';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.post('/', requireRole(ROLES.SYSTEM_ADMIN), create);
router.post('/quote', quote);
router.get('/:code', getOne);
router.patch('/:code', requireRole(ROLES.CREDIT_POLICY, ROLES.SYSTEM_ADMIN, ROLES.SHARIAH_ADVISOR), update);

export default router;
