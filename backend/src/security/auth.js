import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { httpError } from './http.js';
import { User, Role } from '../modules/identity/model/User.js';
import { Customer } from '../modules/customers/model/Customer.js';
const SCOPE_RANK = { OWN: 1, BRANCH: 2, AREA: 3, REGION: 4, ENTITY: 5, ALL: 6 };

export function signToken(user, principal = 'STAFF') {
  return jwt.sign(
    { sub: String(user._id || user.id), principal, tenantId: user.tenantId || env.tenantId },
    env.jwtSecret,
    { expiresIn: '8h' },
  );
}

export function setSession(res, token) {
  res.cookie('los_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie('los_session', { path: '/' });
}

function assignmentActive(row, now) {
  if (row.validFrom && new Date(row.validFrom) > now) return false;
  if (row.validTo && new Date(row.validTo) < now) return false;
  return true;
}

export async function loadEffectiveAccess(user) {
  const now = new Date();
  const active = (user.roles || []).filter((row) => assignmentActive(row, now));
  const roles = await Role.find({
    _id: { $in: active.map((row) => row.roleId) },
    status: 'ACTIVE',
    deletedAt: null,
  }).lean();
  const permissions = new Set();
  const doa = [];
  let widest = 'OWN';
  const scopes = active.map((row) => ({
    roleId: String(row.roleId),
    scopeType: row.scopeType || 'OWN',
    scopeId: row.scopeId || '',
  }));
  for (const role of roles) {
    (role.permissions || []).forEach((code) => permissions.add(code));
    (role.doa || []).forEach((row) => doa.push(row));
    if ((SCOPE_RANK[role.maxScope] || 0) > (SCOPE_RANK[widest] || 0)) widest = role.maxScope;
  }
  return { permissions: [...permissions], scopes, doa, widestScope: widest };
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
    const token = bearer || req.cookies?.los_session;
    if (!token) throw httpError(401, 'Sign in required');
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.principal === 'CUSTOMER') {
      const customer = await Customer.findById(payload.sub).lean();
      if (!customer || customer.status === 'DISABLED' || customer.deletedAt) throw httpError(401, 'Sign in required');
      req.user = {
        id: String(customer._id),
        principal: 'CUSTOMER',
        tenantId: customer.tenantId,
        name: customer.fullName,
        customerId: String(customer._id),
        branchId: customer.branchId || '',
        permissions: [],
        scopes: [],
        doa: [],
        widestScope: 'OWN',
        mustChangePassword: false,
      };
      return next();
    }
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'ACTIVE' || user.deletedAt) throw httpError(401, 'Sign in required');
    const access = await loadEffectiveAccess(user);
    req.user = {
      id: String(user._id),
      principal: 'STAFF',
      tenantId: user.tenantId,
      name: user.name,
      username: user.username,
      branchId: user.branchId || '',
      entityId: user.entityId || '',
      dealerId: user.dealerId || '',
      customerId: '',
      mustChangePassword: Boolean(user.mustChangePassword),
      ...access,
    };
    const open = ['/api/identity/change-password', '/api/identity/logout', '/api/identity/me', '/api/identity/mfa/setup', '/api/identity/mfa/confirm'];
    if (user.mustChangePassword && !open.some((path) => req.originalUrl.startsWith(path))) {
      throw httpError(403, 'Change your password to continue', { code: 'PASSWORD_CHANGE_REQUIRED' });
    }
    next();
  } catch (err) {
    next(err.status ? err : httpError(401, 'Sign in required'));
  }
}

export function requirePermission(code) {
  return (req, res, next) => {
    if (req.user?.principal === 'CUSTOMER') return next(httpError(403, 'You do not have access to this action'));
    if (!req.user?.permissions?.includes(code)) return next(httpError(403, 'You do not have access to this action'));
    next();
  };
}

export function requireCustomer(req, res, next) {
  if (req.user?.principal !== 'CUSTOMER') return next(httpError(403, 'You do not have access to this action'));
  next();
}

export function requireStaffOrCustomer(code) {
  return (req, res, next) => {
    if (req.user?.principal === 'CUSTOMER') return next();
    return requirePermission(code)(req, res, next);
  };
}

export function requireClientHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const bearer = (req.get('authorization') || '').startsWith('Bearer ');
  if (req.get('x-los-client') === 'web' || bearer) return next();
  return next(httpError(403, 'Missing client header'));
}

export function rejectOperators(req, res, next) {
  const walk = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) throw httpError(400, 'Invalid field');
      walk(value[key]);
    }
  };
  try {
    walk(req.body);
    walk(req.query);
    next();
  } catch (err) {
    next(err);
  }
}

const SCOPE_ORDER = ['OWN', 'BRANCH', 'AREA', 'REGION', 'ENTITY', 'ALL'];

export function applyDataScope(query, user, resource) {
  if (!user || user.principal === 'CUSTOMER') return query;
  const scope = user.widestScope || 'ALL';
  if (scope === 'ALL') return query;
  if (scope === 'ENTITY' && user.entityId) query.entityId = user.entityId;
  else if (SCOPE_ORDER.indexOf(scope) <= SCOPE_ORDER.indexOf('REGION') && user.branchId) query.branchId = user.branchId;
  if (scope === 'OWN') {
    if (resource === 'application') query.assignedTo = user.id;
    if (resource === 'loan') query.branchId = user.branchId || query.branchId;
  }
  return query;
}
