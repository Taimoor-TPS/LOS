import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../security/auth.js';
import { approve, create, list, simulate, submit } from '../controller/ruleController.js';

const router = Router();
router.use(requireAuth);
router.get('/', requirePermission('config:view'), list);
router.post('/', requirePermission('config:edit'), create);
router.post('/:id/submit', requirePermission('config:edit'), submit);
router.post('/:id/approve', requirePermission('config:publish'), approve);
router.post('/:id/simulate', requirePermission('config:view'), simulate);
router.patch('/:id', requirePermission('config:edit'), async (req, res, next) => {
  try {
    const { Rule } = await import('../model/Rule.js');
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ code: 'NOT_FOUND', message: 'Rule not found' });
    Object.assign(rule, req.body);
    rule.version = Number(rule.version || 1) + 1;
    await rule.save();
    res.json({ rule });
  } catch (err) { next(err); }
});
router.delete('/:id', requirePermission('config:edit'), async (req, res, next) => {
  try {
    const { Rule } = await import('../model/Rule.js');
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ code: 'NOT_FOUND', message: 'Rule not found' });
    rule.status = 'retired';
    rule.deletedAt = new Date();
    rule.deletedBy = req.user.id;
    await rule.save();
    res.json({ rule });
  } catch (err) { next(err); }
});
export default router;
