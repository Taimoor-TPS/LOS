import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAuth, requirePermission } from '../security/auth.js';
import { asyncHandler, httpError } from '../security/http.js';
import { parse } from '../middleware/validate.js';
import { writeAudit } from '../security/audit.js';
import { assertVersion, bump, listArgs, pageResult } from '../services/common.js';
import {
  FieldDefinition, Form, FormVersion, Workflow, WorkflowVersion, MasterList, Template,
  EscalationRule, Branch, Entity, Holiday,
} from '../models/platformModels.js';
import { Rule } from '../modules/rules/model/Rule.js';
import { ReportDefinition, AccountingTemplate } from '../models/platformModels.js';
import { workflowHash } from '../services/origination.js';

const router = Router();
router.use(requireAuth);

function crud({ path, model, view, edit, search, onDelete }) {
  router.get(path, requirePermission(view), asyncHandler(async (req, res) => {
    const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: search });
    const [items, total] = await Promise.all([
      model.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
      model.countDocuments(filter),
    ]);
    res.json(pageResult(items, page, pageSize, total));
  }));
  router.get(`${path}/:id`, requirePermission(view), asyncHandler(async (req, res) => {
    const item = await model.findById(req.params.id).lean();
    if (!item || item.deletedAt) throw httpError(404, 'Not found');
    res.json({ item });
  }));
  router.post(path, requirePermission(edit), asyncHandler(async (req, res) => {
    const item = await model.create({ ...req.body, createdBy: req.user.id, status: req.body.status || 'ACTIVE' });
    await writeAudit(req, { action: 'create', resource: path, resourceId: item._id, after: item.toObject() });
    res.status(201).json({ item });
  }));
  router.patch(`${path}/:id`, requirePermission(edit), asyncHandler(async (req, res) => {
    const item = await model.findById(req.params.id);
    if (!item || item.deletedAt) throw httpError(404, 'Not found');
    assertVersion(item, req.body.version);
    const before = item.toObject();
    const { version, reason, ...rest } = req.body;
    Object.assign(item, rest);
    bump(item);
    item.updatedBy = req.user.id;
    await item.save();
    await writeAudit(req, { action: 'update', resource: path, resourceId: item._id, before, after: item.toObject(), reason: reason || '' });
    res.json({ item });
  }));
  router.delete(`${path}/:id`, requirePermission(edit), asyncHandler(async (req, res) => {
    const body = parse(z.object({ reason: z.string().min(3) }), req.body || {});
    const item = await model.findById(req.params.id);
    if (!item || item.deletedAt) throw httpError(404, 'Not found');
    if (onDelete) await onDelete(item);
    const before = item.toObject();
    item.status = 'RETIRED';
    item.deletedAt = new Date();
    item.deletedBy = req.user.id;
    if (item.version !== undefined) bump(item);
    await item.save();
    await writeAudit(req, { action: 'delete', resource: path, resourceId: item._id, before, after: item.toObject(), reason: body.reason });
    res.json({ item });
  }));
}

async function fieldImpact(code) {
  const needle = code;
  const hits = [];
  const forms = await Form.find({ deletedAt: null }).lean();
  forms.forEach((form) => {
    if (JSON.stringify(form.sections || []).includes(needle)) hits.push({ type: 'form', id: form._id, code: form.code, status: form.status });
  });
  const rules = await Rule.find({ deletedAt: null }).lean();
  rules.forEach((rule) => {
    if (JSON.stringify(rule.when || {}).includes(needle) || JSON.stringify(rule.then || {}).includes(needle)) {
      hits.push({ type: 'rule', id: rule._id, code: rule.code, status: rule.status });
    }
  });
  const templates = await Template.find({ deletedAt: null }).lean();
  templates.forEach((row) => {
    if (`${row.body || ''} ${row.subject || ''}`.includes(needle)) hits.push({ type: 'template', id: row._id, code: row.code, status: row.status });
  });
  const reports = await ReportDefinition.find({ deletedAt: null }).lean();
  reports.forEach((row) => {
    if (JSON.stringify(row.columns || []).includes(needle)) hits.push({ type: 'report', id: row._id, code: row.code, status: row.status });
  });
  const accounting = await AccountingTemplate.find({ deletedAt: null }).lean();
  accounting.forEach((row) => {
    if (JSON.stringify(row.legs || []).includes(needle)) hits.push({ type: 'accounting_template', id: row._id, code: row.eventCode, status: row.status });
  });
  return hits;
}

router.get('/fields/:code/impact', requirePermission('config:view'), asyncHandler(async (req, res) => {
  res.json({ fieldCode: req.params.code, impacts: await fieldImpact(req.params.code) });
}));

router.get('/fields', requirePermission('config:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['fieldCode', 'dataType'] });
  const [items, total] = await Promise.all([
    FieldDefinition.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    FieldDefinition.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/fields/:id', requirePermission('config:view'), asyncHandler(async (req, res) => {
  const item = await FieldDefinition.findOne({ $or: [{ fieldCode: req.params.id }, { _id: req.params.id.match(/^[a-f\d]{24}$/i) ? req.params.id : undefined }] }).lean();
  if (!item || item.deletedAt) throw httpError(404, 'Field not found');
  res.json({ item });
}));

router.delete('/fields/:id', requirePermission('config:edit'), asyncHandler(async (req, res) => {
  const body = parse(z.object({ reason: z.string().min(3) }), req.body || {});
  const item = await FieldDefinition.findById(req.params.id);
  if (!item || item.deletedAt) throw httpError(404, 'Field not found');
  const impacts = await fieldImpact(item.fieldCode);
  const blocking = impacts.filter((hit) => hit.type === 'rule' && String(hit.status).toLowerCase() === 'active');
  if (blocking.length) throw httpError(409, 'This field is used by an active rule', { code: 'FIELD_IN_USE', details: { impacts } });
  item.status = 'RETIRED';
  item.deletedAt = new Date();
  item.deletedBy = req.user.id;
  bump(item);
  await item.save();
  await writeAudit(req, { action: 'retire', resource: 'field', resourceId: item._id, reason: body.reason, detail: { impacts } });
  res.json({ item, impacts });
}));

router.post('/fields', requirePermission('config:edit'), asyncHandler(async (req, res) => {
  const body = parse(z.object({
    fieldCode: z.string().regex(/^[a-z][a-z0-9_]*$/),
    label: z.record(z.string(), z.string()),
    dataType: z.string(),
    entityScope: z.string(),
    validation: z.any().optional(),
    lookupList: z.string().optional(),
    source: z.string().optional(),
    piiClass: z.string().optional(),
  }), req.body);
  const item = await FieldDefinition.create({ ...body, status: 'ACTIVE', createdBy: req.user.id });
  await writeAudit(req, { action: 'create', resource: 'field', resourceId: item._id, after: item.toObject() });
  res.status(201).json({ item });
}));

router.patch('/fields/:id', requirePermission('config:edit'), asyncHandler(async (req, res) => {
  const item = await FieldDefinition.findById(req.params.id);
  if (!item || item.deletedAt) throw httpError(404, 'Field not found');
  assertVersion(item, req.body.version);
  if (item.isSystem && req.body.dataType && req.body.dataType !== item.dataType) {
    throw httpError(409, 'A system field cannot change data type', { code: 'SYSTEM_FIELD' });
  }
  if (req.body.dataType && req.body.dataType !== item.dataType) {
    const { Application } = await import('../modules/applications/model/Application.js');
    const used = await Application.countDocuments({ [`attributes.${item.fieldCode}`]: { $exists: true } });
    if (used) throw httpError(409, 'Data type cannot change after values have been stored');
  }
  const before = item.toObject();
  const { version, reason, fieldCode, isSystem, ...rest } = req.body;
  Object.assign(item, rest);
  bump(item);
  await item.save();
  await writeAudit(req, { action: 'update', resource: 'field', resourceId: item._id, before, after: item.toObject(), reason: reason || '' });
  res.json({ item });
}));

crud({ path: '/forms', model: Form, view: 'config:view', edit: 'config:edit', search: ['code', 'name'] });
router.post('/forms/:id/publish', requirePermission('config:publish'), asyncHandler(async (req, res) => {
  const form = await Form.findById(req.params.id);
  if (!form) throw httpError(404, 'Form not found');
  const version = (form.publishedVersion || 0) + 1;
  const hash = workflowHash(form.sections);
  await FormVersion.create({ formId: form._id, code: form.code, version, hash, binding: form.binding, sections: form.sections, publishedAt: new Date(), publishedBy: req.user.id });
  form.publishedVersion = version;
  form.status = 'ACTIVE';
  bump(form);
  await form.save();
  await writeAudit(req, { action: 'publish', resource: 'form', resourceId: form._id, detail: { version, hash } });
  res.json({ item: form, version, hash });
}));
router.get('/forms/:id/versions', requirePermission('config:view'), asyncHandler(async (req, res) => {
  const items = await FormVersion.find({ formId: req.params.id }).sort({ version: -1 }).lean();
  res.json({ items });
}));

crud({ path: '/workflows', model: Workflow, view: 'config:view', edit: 'config:edit', search: ['code', 'name'] });
router.post('/workflows/:id/publish', requirePermission('config:publish'), asyncHandler(async (req, res) => {
  const workflow = await Workflow.findById(req.params.id);
  if (!workflow) throw httpError(404, 'Workflow not found');
  const version = (workflow.publishedVersion || 0) + 1;
  await WorkflowVersion.create({
    workflowId: workflow._id, code: workflow.code, version, stages: workflow.stages, transitions: workflow.transitions,
    hash: workflowHash({ stages: workflow.stages, transitions: workflow.transitions }),
  });
  workflow.publishedVersion = version;
  workflow.status = 'ACTIVE';
  bump(workflow);
  await workflow.save();
  await writeAudit(req, { action: 'publish', resource: 'workflow', resourceId: workflow._id, detail: { version } });
  res.json({ item: workflow });
}));

crud({ path: '/masters', model: MasterList, view: 'config:view', edit: 'config:edit', search: ['code', 'name'] });
router.post('/masters/:id/values', requirePermission('config:edit'), asyncHandler(async (req, res) => {
  const list = await MasterList.findById(req.params.id);
  if (!list) throw httpError(404, 'List not found');
  const body = parse(z.object({
    code: z.string(), value: z.record(z.string(), z.string()), parentCode: z.string().optional(), attributes: z.any().optional(), sortOrder: z.number().optional(),
  }), req.body);
  list.values.push({ ...body, status: 'ACTIVE' });
  bump(list);
  await list.save();
  res.json({ item: list });
}));
router.delete('/masters/:id/values/:code', requirePermission('config:edit'), asyncHandler(async (req, res) => {
  const list = await MasterList.findById(req.params.id);
  if (!list) throw httpError(404, 'List not found');
  list.values = (list.values || []).map((row) => (row.code === req.params.code ? { ...row, status: 'RETIRED' } : row));
  bump(list);
  await list.save();
  res.json({ item: list });
}));

crud({ path: '/templates', model: Template, view: 'config:view', edit: 'config:edit', search: ['code', 'name'] });
router.post('/templates/:id/preview', requirePermission('config:view'), asyncHandler(async (req, res) => {
  const item = await Template.findById(req.params.id).lean();
  if (!item) throw httpError(404, 'Template not found');
  const sample = req.body?.sample || { customer: { firstName: 'Amina' }, application: { reference: 'PK01PFS261001000001' } };
  const body = String(item.body || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const value = path.split('.').reduce((cursor, key) => (cursor == null ? undefined : cursor[key]), sample);
    return value == null ? '' : String(value);
  });
  res.json({ body, subject: item.subject });
}));

crud({ path: '/escalations', model: EscalationRule, view: 'config:view', edit: 'config:edit', search: ['code', 'name'] });
router.get('/org/branches', requirePermission('config:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['code', 'name'] });
  const [items, total] = await Promise.all([Branch.find(filter).sort(sort).skip(skip).limit(pageSize).lean(), Branch.countDocuments(filter)]);
  res.json(pageResult(items, page, pageSize, total));
}));
router.post('/org/branches', requirePermission('config:edit'), asyncHandler(async (req, res) => {
  const item = await Branch.create(req.body);
  res.status(201).json({ item });
}));
router.patch('/org/branches/:id', requirePermission('config:edit'), asyncHandler(async (req, res) => {
  const item = await Branch.findById(req.params.id);
  if (!item) throw httpError(404, 'Branch not found');
  assertVersion(item, req.body.version);
  Object.assign(item, req.body);
  bump(item);
  await item.save();
  res.json({ item });
}));
router.delete('/org/branches/:id', requirePermission('config:edit'), asyncHandler(async (req, res) => {
  const item = await Branch.findById(req.params.id);
  if (!item) throw httpError(404, 'Branch not found');
  item.status = 'RETIRED';
  item.deletedAt = new Date();
  item.deletedBy = req.user.id;
  await item.save();
  res.json({ item });
}));
router.get('/org/entities', requirePermission('config:view'), asyncHandler(async (req, res) => {
  const items = await Entity.find({ deletedAt: null }).lean();
  res.json({ items, page: 1, pageSize: items.length, total: items.length });
}));
router.post('/org/entities', requirePermission('config:edit'), asyncHandler(async (req, res) => {
  const item = await Entity.create(req.body);
  res.status(201).json({ item });
}));
router.get('/org/holidays', requirePermission('config:view'), asyncHandler(async (req, res) => {
  const items = await Holiday.find({ deletedAt: null }).lean();
  res.json({ items, page: 1, pageSize: items.length, total: items.length });
}));
router.post('/org/holidays', requirePermission('config:edit'), asyncHandler(async (req, res) => {
  const item = await Holiday.create(req.body);
  res.status(201).json({ item });
}));

export default router;
