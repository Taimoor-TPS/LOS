import { z } from 'zod';
import { Rule } from '../model/Rule.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { writeAudit } from '../../../security/audit.js';
import { matchRule } from '../../../engine/rulesEngine.js';
import { CHECKER_ROLES } from '../../../security/roles.js';

export const list = asyncHandler(async (req, res) => {
  const rules = await Rule.find().sort({ stage: 1, priority: 1 }).lean();
  res.json({ rules });
});

export const create = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    code: z.string(),
    name: z.string(),
    stage: z.enum(['eligibility', 'fraud', 'policy', 'pricing']),
    priority: z.number().default(100),
    appliesTo: z.object({
      products: z.array(z.string()).default(['*']),
      segments: z.array(z.string()).default(['*']),
      jurisdictions: z.array(z.string()).default(['*']),
    }).optional(),
    when: z.object({ all: z.array(z.object({ field: z.string(), op: z.string(), value: z.any() })).optional(), any: z.array(z.object({ field: z.string(), op: z.string(), value: z.any() })).optional() }),
    then: z.object({ outcome: z.enum(['decline', 'refer', 'approve']).nullable().optional(), reasonCode: z.string(), stop: z.boolean().optional() }),
    comment: z.string().optional(),
  }), req.body);
  const latest = await Rule.findOne({ code: body.code }).sort({ version: -1 }).lean();
  const rule = await Rule.create({
    ...body,
    version: (latest?.version || 0) + 1,
    status: 'draft',
    enabled: true,
    makerId: req.user.id,
    makerName: req.user.name,
  });
  res.status(201).json({ rule });
});

export const submit = asyncHandler(async (req, res) => {
  const rule = await Rule.findById(req.params.id);
  if (!rule) throw httpError(404, 'Rule not found');
  rule.status = 'pending_approval';
  await rule.save();
  res.json({ rule });
});

export const approve = asyncHandler(async (req, res) => {
  const rule = await Rule.findById(req.params.id);
  if (!rule) throw httpError(404, 'Rule not found');
  if (!CHECKER_ROLES.includes(req.user.role)) throw httpError(403, 'Your role cannot approve a rule');
  if (rule.makerId === req.user.id) throw httpError(403, 'Maker cannot approve their own rule');
  await Rule.updateMany({ code: rule.code, status: 'active' }, { status: 'retired', enabled: false });
  rule.status = 'active';
  rule.checkerId = req.user.id;
  rule.checkerName = req.user.name;
  await rule.save();
  await writeAudit(req, { action: 'rule_approve', resource: 'rule', resourceId: rule._id, detail: { code: rule.code } });
  res.json({ rule });
});

export const simulate = asyncHandler(async (req, res) => {
  const rule = await Rule.findById(req.params.id).lean();
  if (!rule) throw httpError(404, 'Rule not found');
  const body = parse(z.object({ features: z.record(z.string(), z.any()) }), req.body);
  res.json({ matched: matchRule(rule, body.features) });
});
