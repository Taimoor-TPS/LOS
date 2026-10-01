import { z } from 'zod';
import { ConfigEntry } from '../model/ConfigEntry.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { writeAudit } from '../../../security/audit.js';
import { canApproveConfig } from '../../../security/roles.js';
import { resolveLayers } from '../../../engine/configurationEngine.js';

const scopeSchema = z.object({
  level: z.enum(['system', 'jurisdiction', 'tenant', 'entity', 'segment', 'product', 'channel']),
  jurisdiction: z.string().optional(),
  tenantId: z.string().optional(),
  entityId: z.string().optional(),
  segment: z.string().optional(),
  productCode: z.string().optional(),
  channel: z.string().optional(),
});

export const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.key) filter.key = String(req.query.key);
  if (req.query.status) filter.status = String(req.query.status);
  const entries = await ConfigEntry.find(filter).sort({ key: 1, updatedAt: -1 }).lean();
  res.json({ entries });
});

export const resolve = asyncHandler(async (req, res) => {
  const key = String(req.query.key || '');
  if (!key) throw httpError(400, 'A configuration key is required');
  const context = {
    jurisdiction: String(req.query.jurisdiction || 'PK'),
    tenantId: String(req.query.tenantId || req.user.tenantId),
    entityId: String(req.query.entityId || ''),
    segment: String(req.query.segment || ''),
    productCode: String(req.query.productCode || ''),
    channel: String(req.query.channel || ''),
  };
  const entries = await ConfigEntry.find({ key }).lean();
  const resolved = resolveLayers(entries, context);
  res.json({
    key,
    context,
    value: resolved.value,
    chain: resolved.chain.map((entry) => ({
      id: entry._id,
      level: entry.scope?.level,
      version: entry.version,
      scope: entry.scope,
      value: entry.value,
    })),
  });
});

export const create = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    key: z.string().min(2),
    scope: scopeSchema,
    value: z.record(z.string(), z.any()),
    comment: z.string().optional(),
  }), req.body);
  const latest = await ConfigEntry.findOne({ key: body.key }).sort({ version: -1 }).lean();
  const entry = await ConfigEntry.create({
    ...body,
    version: (latest?.version || 0) + 1,
    status: 'draft',
    makerId: req.user.id,
    makerName: req.user.name,
  });
  await writeAudit(req, { action: 'config_draft', resource: 'configuration', resourceId: entry._id, detail: { key: entry.key } });
  res.status(201).json({ entry });
});

export const submit = asyncHandler(async (req, res) => {
  const entry = await ConfigEntry.findById(req.params.id);
  if (!entry) throw httpError(404, 'Configuration not found');
  if (entry.status !== 'draft') throw httpError(409, 'Only a draft can be submitted');
  entry.status = 'pending_approval';
  await entry.save();
  res.json({ entry });
});

export const approve = asyncHandler(async (req, res) => {
  const entry = await ConfigEntry.findById(req.params.id);
  if (!entry) throw httpError(404, 'Configuration not found');
  if (entry.status !== 'pending_approval') throw httpError(409, 'This change is not waiting for approval');
  if (entry.makerId === req.user.id) throw httpError(403, 'Maker cannot approve their own change');
  if (!canApproveConfig(req.user, entry.key)) throw httpError(403, 'Your role cannot approve this configuration');
  await ConfigEntry.updateMany({ key: entry.key, scopeKey: entry.scopeKey, status: 'active', _id: { $ne: entry._id } }, { status: 'retired' });
  entry.status = 'active';
  entry.checkerId = req.user.id;
  entry.checkerName = req.user.name;
  entry.approvedAt = new Date();
  await entry.save();
  await writeAudit(req, { action: 'config_approve', resource: 'configuration', resourceId: entry._id, detail: { key: entry.key, version: entry.version } });
  res.json({ entry });
});

export const reject = asyncHandler(async (req, res) => {
  const entry = await ConfigEntry.findById(req.params.id);
  if (!entry) throw httpError(404, 'Configuration not found');
  if (entry.makerId === req.user.id) throw httpError(403, 'Maker cannot reject their own change');
  entry.status = 'retired';
  entry.checkerId = req.user.id;
  entry.checkerName = req.user.name;
  await entry.save();
  res.json({ entry });
});
