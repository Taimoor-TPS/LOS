import { Router } from 'express';
import { env } from '../../../config/env.js';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { httpError } from '../../../security/http.js';

function gate(router) {
  router.use(requireAuth);
  router.use((req, res, next) => {
    if (!env.featuresExtended) return next(httpError(404, 'Not found'));
    next();
  });
}

export function extendedRouter(handlers) {
  const router = Router();
  gate(router);
  handlers(router);
  return router;
}

export { requirePermission };
