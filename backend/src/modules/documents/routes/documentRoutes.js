import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { asyncHandler } from '../../../security/http.js';
import { templates } from '../controller/documentController.js';

const router = Router();
router.get('/templates', requireAuth, requirePermission('config:view'), asyncHandler(async (req, res) => {
  res.json({ templates });
}));

export default router;
