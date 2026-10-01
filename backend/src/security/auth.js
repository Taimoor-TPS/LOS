import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { httpError } from './http.js';
import { User } from '../modules/identity/model/User.js';

export function signToken(user) {
  return jwt.sign(
    { sub: String(user._id || user.id), role: user.role, tenantId: user.tenantId },
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

export async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
    const token = bearer || req.cookies?.los_session;
    if (!token) throw httpError(401, 'Sign in required');
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).lean();
    if (!user || user.status !== 'active') throw httpError(401, 'Sign in required');
    req.user = {
      id: String(user._id),
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
      doaLimit: user.doaLimit || 0,
      branchId: user.branchId || '',
      customerId: user.customerId ? String(user.customerId) : '',
      dealerId: user.dealerId || '',
    };
    next();
  } catch (err) {
    next(err.status ? err : httpError(401, 'Sign in required'));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return next(httpError(403, 'You do not have access to this action'));
    next();
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
