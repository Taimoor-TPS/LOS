import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authenticator } from 'otplib';
import { User, Role } from '../model/User.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { assertNotReused, hashPassword, verifyPassword } from '../../../security/password.js';
import { clearSession, loadEffectiveAccess, setSession, signToken } from '../../../security/auth.js';
import { writeAudit } from '../../../security/audit.js';
import { ConfigEntry } from '../../configuration/model/ConfigEntry.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Wait a few minutes.' },
});

export async function presentStaff(user, { permissions, scopes } = {}) {
  const access = permissions ? { permissions, scopes } : await loadEffectiveAccess(user);
  return {
    id: user._id,
    username: user.username,
    name: user.name,
    email: user.email || '',
    principal: 'STAFF',
    tenantId: user.tenantId,
    branchId: user.branchId,
    entityId: user.entityId,
    mustChangePassword: Boolean(user.mustChangePassword),
    status: user.status,
    mfaEnabled: Boolean(user.mfa?.enabled),
    permissions: access.permissions,
    scopes: access.scopes,
    version: user.version,
  };
}

export const login = [loginLimiter, asyncHandler(async (req, res) => {
  const body = parse(z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    otp: z.string().optional(),
  }), req.body);
  const user = await User.findOne({ username: body.username.toLowerCase(), deletedAt: null });
  const invalid = httpError(401, 'Invalid username or password');
  if (!user || user.status === 'DISABLED') throw invalid;
  if (user.status === 'LOCKED' || (user.lockedUntil && user.lockedUntil > new Date())) {
    throw httpError(423, 'This account is locked');
  }
  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= 5) {
      user.status = 'LOCKED';
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedAttempts = 0;
    }
    await user.save();
    throw invalid;
  }
  const mfaSetting = await ConfigEntry.findOne({ key: 'security.mfaRequired', status: 'active' }).lean();
  if ((mfaSetting?.value?.enabled || user.mfa?.enabled) && user.mfa?.secret) {
    if (!body.otp || !authenticator.verify({ token: body.otp, secret: user.mfa.secret })) {
      throw httpError(401, 'Multi-factor code is required', { code: 'MFA_REQUIRED' });
    }
  }
  user.failedAttempts = 0;
  user.lockedUntil = undefined;
  if (user.status === 'LOCKED') user.status = 'ACTIVE';
  user.lastLoginAt = new Date();
  await user.save();
  setSession(res, signToken(user, 'STAFF'));
  await writeAudit(req, { action: 'login', resource: 'user', resourceId: user._id, actorId: user._id, actorName: user.name, tenantId: user.tenantId });
  const access = await loadEffectiveAccess(user);
  res.json({ user: await presentStaff(user, access) });
})];

export const logout = asyncHandler(async (req, res) => {
  await writeAudit(req, { action: 'logout', resource: 'user', resourceId: req.user?.id });
  clearSession(res);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  if (req.user.principal === 'CUSTOMER') {
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        principal: 'CUSTOMER',
        customerId: req.user.customerId,
        tenantId: req.user.tenantId,
        permissions: [],
        scopes: [],
      },
      permissions: [],
      scopes: [],
    });
    return;
  }
  const user = await User.findById(req.user.id);
  const presented = await presentStaff(user);
  res.json({ user: presented, permissions: presented.permissions, scopes: presented.scopes });
});

export const changePassword = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12),
  }), req.body);
  const user = await User.findById(req.user.id);
  if (!user) throw httpError(404, 'User not found');
  if (!await verifyPassword(body.currentPassword, user.passwordHash)) throw httpError(401, 'Current password is wrong');
  await assertNotReused(body.newPassword, [...(user.passwordHistory || []), user.passwordHash]);
  user.passwordHistory = [...(user.passwordHistory || []), user.passwordHash].slice(-5);
  user.passwordHash = await hashPassword(body.newPassword);
  user.mustChangePassword = false;
  user.version += 1;
  await user.save();
  await writeAudit(req, { action: 'password_change', resource: 'user', resourceId: user._id });
  res.json({ user: await presentStaff(user) });
});

export const mfaSetup = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const secret = authenticator.generateSecret();
  user.mfa = { enabled: false, secret };
  await user.save();
  res.json({ secret, uri: authenticator.keyuri(user.username, 'Lending Platform', secret) });
});

export const mfaConfirm = asyncHandler(async (req, res) => {
  const body = parse(z.object({ otp: z.string().min(6) }), req.body);
  const user = await User.findById(req.user.id);
  if (!user.mfa?.secret || !authenticator.verify({ token: body.otp, secret: user.mfa.secret })) {
    throw httpError(400, 'The code does not match');
  }
  user.mfa.enabled = true;
  await user.save();
  res.json({ enabled: true });
});

export async function countSuperAdmins(exceptId) {
  const role = await Role.findOne({ code: 'SUPER_ADMIN' }).lean();
  if (!role) return 0;
  return User.countDocuments({
    status: 'ACTIVE',
    deletedAt: null,
    _id: exceptId ? { $ne: exceptId } : { $exists: true },
    'roles.roleId': role._id,
  });
}
