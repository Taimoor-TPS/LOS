import { Router } from 'express';
import { env } from '../../../config/env.js';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { httpError } from '../../../security/http.js';
import { create, list } from '../controller/schemeController.js';

const router = Router();
router.use(requireAuth);
router.use((req, res, next) => (env.featuresExtended ? next() : next(httpError(404, 'Not found'))));
router.get('/', requirePermission('config:view'), list);
router.post('/', requirePermission('config:edit'), create);
export default router;
