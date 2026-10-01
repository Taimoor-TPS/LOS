import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { approve, create, list, simulate, submit } from '../controller/scorecardController.js';

const router = Router();
router.use(requireAuth);
router.get('/', requirePermission('config:view'), list);
router.post('/', requirePermission('config:edit'), create);
router.post('/:id/submit', requirePermission('config:edit'), submit);
router.post('/:id/approve', requirePermission('config:publish'), approve);
router.post('/:id/simulate', requirePermission('config:view'), simulate);
export default router;
