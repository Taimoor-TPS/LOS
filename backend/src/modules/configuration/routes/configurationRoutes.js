import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { approve, create, list, reject, resolve, submit } from '../controller/configurationController.js';

const router = Router();
router.use(requireAuth);
router.get('/', requirePermission('config:view'), list);
router.get('/resolve', requirePermission('config:view'), resolve);
router.post('/', requirePermission('config:edit'), create);
router.post('/:id/submit', requirePermission('config:edit'), submit);
router.post('/:id/approve', requirePermission('config:publish'), approve);
router.post('/:id/reject', requirePermission('config:publish'), reject);
export default router;
