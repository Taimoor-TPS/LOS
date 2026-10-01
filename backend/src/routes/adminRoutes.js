import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAuth, requirePermission } from '../security/auth.js';
import { asyncHandler, httpError } from '../security/http.js';
import { parse } from '../middleware/validate.js';
import { writeAudit } from '../security/audit.js';
import { User, Role, Permission, SodRule } from '../modules/identity/model/User.js';
import { hashPassword } from '../security/password.js';
import { assertVersion, bump, listArgs, pageResult } from '../services/common.js';
import { isSingleCheckerMode, selfAuthorisationAllowed, sodWarnings } from '../security/rbac.js';
import { countSuperAdmins } from '../modules/identity/controller/identityController.js';

const router = Router();
router.use(requireAuth);

function randomPassword() {
  const raw = `Aa1!${crypto.randomBytes(9).toString('base64url')}`;
  return raw.slice(0, 16);
}

router.get('/users', requirePermission('rbac:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['username', 'name', 'email', 'employeeId'] });
  filter.deletedAt = null;
  const [items, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(pageSize).select('-passwordHash -passwordHistory -mfa.secret').lean(),
    User.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/users/:id', requirePermission('rbac:view'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash -passwordHistory -mfa.secret').lean();
  if (!user || user.deletedAt) throw httpError(404, 'User not found');
  res.json({ item: user });
}));

router.post('/users', requirePermission('rbac:manage_users'), asyncHandler(async (req, res) => {
  const body = parse(z.object({
    username: z.string().min(3),
    name: z.string().min(2),
    email: z.string().email().optional().or(z.literal('')),
    mobile: z.string().optional(),
    employeeId: z.string().optional(),
    branchId: z.string().optional(),
    entityId: z.string().optional(),
    roles: z.array(z.object({
      roleId: z.string(),
      scopeType: z.string().default('ALL'),
      scopeId: z.string().optional(),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
    })).default([]),
    password: z.string().min(12).optional(),
  }), req.body);
  const password = body.password || randomPassword();
  const user = await User.create({
    username: body.username.toLowerCase(),
    name: body.name,
    email: body.email || undefined,
    mobile: body.mobile || '',
    employeeId: body.employeeId || '',
    branchId: body.branchId || '',
    entityId: body.entityId || 'PK-01',
    tenantId: req.user.tenantId,
    roles: body.roles,
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
    status: 'ACTIVE',
    createdBy: req.user.id,
  });
  await writeAudit(req, { action: 'create', resource: 'user', resourceId: user._id, after: { username: user.username, roles: user.roles } });
  res.status(201).json({ item: { id: user._id, username: user.username, mustChangePassword: true }, temporaryPassword: body.password ? undefined : password });
}));

router.patch('/users/:id', requirePermission('rbac:manage_users'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) throw httpError(404, 'User not found');
  const body = parse(z.object({
    version: z.number(),
    name: z.string().optional(),
    email: z.string().optional(),
    mobile: z.string().optional(),
    branchId: z.string().optional(),
    entityId: z.string().optional(),
    roles: z.array(z.any()).optional(),
    status: z.enum(['ACTIVE', 'DISABLED', 'LOCKED']).optional(),
    reason: z.string().optional(),
  }), req.body);
  assertVersion(user, body.version);
  const before = user.toObject();
  ['name', 'email', 'mobile', 'branchId', 'entityId', 'roles', 'status'].forEach((key) => {
    if (body[key] !== undefined) user[key] = body[key];
  });
  bump(user);
  user.updatedBy = req.user.id;
  await user.save();
  await writeAudit(req, { action: 'update', resource: 'user', resourceId: user._id, before, after: user.toObject(), reason: body.reason || '' });
  res.json({ item: user });
}));

router.delete('/users/:id', requirePermission('rbac:manage_users'), asyncHandler(async (req, res) => {
  const body = parse(z.object({ reason: z.string().min(3) }), req.body || {});
  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) throw httpError(404, 'User not found');
  const role = await Role.findOne({ code: 'SUPER_ADMIN' }).lean();
  const holds = (user.roles || []).some((row) => String(row.roleId) === String(role?._id));
  if (holds) {
    const others = await countSuperAdmins(user._id);
    if (others < 1) throw httpError(409, 'The last super administrator cannot be deleted', { code: 'LAST_SUPER_ADMIN' });
  }
  if (String(user._id) === req.user.id) throw httpError(409, 'You cannot delete your own user');
  const before = user.toObject();
  user.status = 'DISABLED';
  user.deletedAt = new Date();
  user.deletedBy = req.user.id;
  bump(user);
  await user.save();
  await writeAudit(req, { action: 'delete', resource: 'user', resourceId: user._id, before, after: user.toObject(), reason: body.reason });
  res.json({ item: user });
}));

router.post('/users/:id/reset-password', requirePermission('rbac:manage_users'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) throw httpError(404, 'User not found');
  const temporaryPassword = randomPassword();
  user.passwordHistory = [...(user.passwordHistory || []), user.passwordHash].slice(-5);
  user.passwordHash = await hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  bump(user);
  await user.save();
  await writeAudit(req, { action: 'reset_password', resource: 'user', resourceId: user._id });
  res.json({ temporaryPassword });
}));

router.post('/users/:id/unlock', requirePermission('rbac:unlock'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  user.status = 'ACTIVE';
  user.failedAttempts = 0;
  user.lockedUntil = undefined;
  bump(user);
  await user.save();
  await writeAudit(req, { action: 'unlock', resource: 'user', resourceId: user._id, after: user.toObject() });
  res.json({ item: user });
}));

router.post('/users/:id/disable', requirePermission('rbac:manage_users'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  if (String(user._id) === req.user.id) throw httpError(409, 'You cannot disable your own user');
  user.status = 'DISABLED';
  bump(user);
  await user.save();
  await writeAudit(req, { action: 'disable', resource: 'user', resourceId: user._id });
  res.json({ item: user });
}));

router.post('/users/:id/enable', requirePermission('rbac:manage_users'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) throw httpError(404, 'User not found');
  user.status = 'ACTIVE';
  user.lockedUntil = undefined;
  bump(user);
  await user.save();
  await writeAudit(req, { action: 'enable', resource: 'user', resourceId: user._id });
  res.json({ item: user });
}));

router.get('/checker-mode', requirePermission('rbac:view'), asyncHandler(async (req, res) => {
  const permission = String(req.query.permission || 'config:publish');
  res.json({
    permission,
    singleChecker: await isSingleCheckerMode(permission, req.user.id),
    allowSelfAuthorisation: await selfAuthorisationAllowed(),
  });
}));

router.get('/roles', requirePermission('rbac:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['code', 'name'] });
  const [items, total] = await Promise.all([
    Role.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    Role.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/roles/:id', requirePermission('rbac:view'), asyncHandler(async (req, res) => {
  const item = await Role.findById(req.params.id).lean();
  if (!item || item.deletedAt) throw httpError(404, 'Role not found');
  res.json({ item });
}));

router.post('/roles', requirePermission('rbac:manage_roles'), asyncHandler(async (req, res) => {
  const body = parse(z.object({
    code: z.string().min(2),
    name: z.string().min(2),
    description: z.string().optional(),
    type: z.enum(['BUSINESS', 'SUPERVISORY', 'ADMIN', 'READ_ONLY']).default('BUSINESS'),
    permissions: z.array(z.string()).default([]),
    maxScope: z.enum(['OWN', 'BRANCH', 'AREA', 'REGION', 'ENTITY', 'ALL']).default('BRANCH'),
    doa: z.array(z.any()).optional(),
  }), req.body);
  const warnings = await sodWarnings(body.permissions);
  const item = await Role.create({ ...body, createdBy: req.user.id, status: 'ACTIVE' });
  await writeAudit(req, { action: 'create', resource: 'role', resourceId: item._id, after: item.toObject() });
  res.status(201).json({ item, warnings });
}));

router.patch('/roles/:id', requirePermission('rbac:manage_roles'), asyncHandler(async (req, res) => {
  const item = await Role.findById(req.params.id);
  if (!item || item.deletedAt) throw httpError(404, 'Role not found');
  const body = parse(z.object({
    version: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    maxScope: z.string().optional(),
    doa: z.array(z.any()).optional(),
    reason: z.string().optional(),
  }), req.body);
  assertVersion(item, body.version);
  const before = item.toObject();
  ['name', 'description', 'type', 'permissions', 'maxScope', 'doa'].forEach((key) => {
    if (body[key] !== undefined) item[key] = body[key];
  });
  if (item.code === 'SUPER_ADMIN') item.permissions = (await Permission.find().lean()).map((row) => row.code);
  bump(item);
  item.updatedBy = req.user.id;
  await item.save();
  const warnings = await sodWarnings(item.permissions || []);
  await writeAudit(req, { action: 'update', resource: 'role', resourceId: item._id, before, after: item.toObject(), reason: body.reason || '' });
  res.json({ item, warnings });
}));

router.post('/roles/:id/clone', requirePermission('rbac:manage_roles'), asyncHandler(async (req, res) => {
  const source = await Role.findById(req.params.id).lean();
  if (!source) throw httpError(404, 'Role not found');
  const body = parse(z.object({ code: z.string().min(2), name: z.string().min(2) }), req.body);
  const item = await Role.create({
    code: body.code,
    name: body.name,
    description: source.description,
    type: source.type,
    permissions: source.permissions,
    maxScope: source.maxScope,
    doa: source.doa,
    isSystem: false,
    createdBy: req.user.id,
  });
  await writeAudit(req, { action: 'clone', resource: 'role', resourceId: item._id, detail: { from: source.code } });
  res.status(201).json({ item });
}));

router.delete('/roles/:id', requirePermission('rbac:manage_roles'), asyncHandler(async (req, res) => {
  const body = parse(z.object({ reason: z.string().min(3) }), req.body || {});
  const item = await Role.findById(req.params.id);
  if (!item || item.deletedAt) throw httpError(404, 'Role not found');
  if (item.isSystem) throw httpError(409, 'A system role cannot be deleted');
  const users = await User.find({ 'roles.roleId': item._id, status: 'ACTIVE', deletedAt: null }).select('username name').lean();
  if (users.length) {
    throw httpError(409, 'This role is assigned to active users', { code: 'ROLE_IN_USE', details: { users } });
  }
  item.status = 'RETIRED';
  item.deletedAt = new Date();
  item.deletedBy = req.user.id;
  bump(item);
  await item.save();
  await writeAudit(req, { action: 'delete', resource: 'role', resourceId: item._id, reason: body.reason });
  res.json({ item });
}));

router.get('/permissions', requirePermission('rbac:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['code', 'description', 'module'] });
  delete filter.deletedAt;
  const [items, total] = await Promise.all([
    Permission.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    Permission.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/permissions/:id', requirePermission('rbac:view'), asyncHandler(async (req, res) => {
  const item = await Permission.findOne({ $or: [{ _id: req.params.id.match(/^[a-f\d]{24}$/i) ? req.params.id : null }, { code: req.params.id }] }).lean();
  if (!item) throw httpError(404, 'Permission not found');
  res.json({ item });
}));

router.get('/sod-rules', requirePermission('rbac:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['code', 'description'] });
  const [items, total] = await Promise.all([
    SodRule.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    SodRule.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/sod-rules/:id', requirePermission('rbac:view'), asyncHandler(async (req, res) => {
  const item = await SodRule.findById(req.params.id).lean();
  if (!item || item.deletedAt) throw httpError(404, 'Rule not found');
  res.json({ item });
}));

router.post('/sod-rules', requirePermission('rbac:manage_roles'), asyncHandler(async (req, res) => {
  const body = parse(z.object({
    code: z.string(),
    permissionA: z.string(),
    permissionB: z.string(),
    level: z.enum(['USER', 'CASE']).default('CASE'),
    action: z.enum(['BLOCK', 'WARN']).default('BLOCK'),
    description: z.string().optional(),
  }), req.body);
  const item = await SodRule.create(body);
  await writeAudit(req, { action: 'create', resource: 'sod_rule', resourceId: item._id, after: item.toObject() });
  res.status(201).json({ item });
}));

router.patch('/sod-rules/:id', requirePermission('rbac:manage_roles'), asyncHandler(async (req, res) => {
  const item = await SodRule.findById(req.params.id);
  if (!item || item.deletedAt) throw httpError(404, 'Rule not found');
  const body = parse(z.object({
    version: z.number(),
    permissionA: z.string().optional(),
    permissionB: z.string().optional(),
    level: z.string().optional(),
    action: z.string().optional(),
    description: z.string().optional(),
    reason: z.string().optional(),
  }), req.body);
  assertVersion(item, body.version);
  const before = item.toObject();
  Object.assign(item, body);
  bump(item);
  await item.save();
  await writeAudit(req, { action: 'update', resource: 'sod_rule', resourceId: item._id, before, after: item.toObject(), reason: body.reason || '' });
  res.json({ item });
}));

router.delete('/sod-rules/:id', requirePermission('rbac:manage_roles'), asyncHandler(async (req, res) => {
  const body = parse(z.object({ reason: z.string().min(3) }), req.body || {});
  const item = await SodRule.findById(req.params.id);
  if (!item || item.deletedAt) throw httpError(404, 'Rule not found');
  item.status = 'RETIRED';
  item.deletedAt = new Date();
  item.deletedBy = req.user.id;
  bump(item);
  await item.save();
  await writeAudit(req, { action: 'delete', resource: 'sod_rule', resourceId: item._id, reason: body.reason });
  res.json({ item });
}));

export default router;
