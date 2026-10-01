import { Router } from 'express';
import { env } from '../../../config/env.js';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { httpError } from '../../../security/http.js';
import { acknowledge, list } from '../controller/earlyWarningController.js';

const router = Router();
router.use(requireAuth);
router.use((req, res, next) => (env.featuresExtended ? next() : next(httpError(404, 'Not found'))));
router.get('/', requirePermission('loan:view'), list);
router.post('/:id/acknowledge', requirePermission('loan:view'), acknowledge);
export default router;
