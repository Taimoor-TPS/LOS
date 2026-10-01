import { Router } from 'express';
import { env } from '../../../config/env.js';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { httpError } from '../../../security/http.js';
import { list, originate } from '../controller/dealerController.js';

const router = Router();
router.use(requireAuth);
router.use((req, res, next) => (env.featuresExtended ? next() : next(httpError(404, 'Not found'))));
router.get('/', requirePermission('application:view'), list);
router.post('/originate', requirePermission('application:create'), originate);
export default router;
