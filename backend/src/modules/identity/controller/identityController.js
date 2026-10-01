import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { User } from '../model/User.js';
import { Customer } from '../../customers/model/Customer.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { hashPassword, verifyPassword } from '../../../security/password.js';
import { clearSession, setSession, signToken } from '../../../security/auth.js';
import { writeAudit } from '../../../security/audit.js';
import { env } from '../../../config/env.js';
import { ROLES } from '../../../security/roles.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Wait a few minutes.' },
});

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    branchId: user.branchId,
    dealerId: user.dealerId,
    customerId: user.customerId,
    doaLimit: user.doaLimit,
    skills: user.skills,
    locale: user.locale,
  };
}

export const login = [loginLimiter, asyncHandler(async (req, res) => {
  const body = parse(z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }), req.body);
  const user = await User.findOne({ email: body.email.toLowerCase() });
  const invalid = httpError(401, 'Invalid email or password');
  if (!user || user.status !== 'active') throw invalid;
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw httpError(423, 'This account is locked for a few minutes');
  }
  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedAttempts = 0;
    }
    await user.save();
    throw invalid;
  }
  user.failedAttempts = 0;
  user.lockedUntil = undefined;
  await user.save();
  setSession(res, signToken(user));
  await writeAudit(req, { action: 'login', resource: 'user', resourceId: user._id, actorId: user._id, actorName: user.name, actorRole: user.role, tenantId: user.tenantId });
  res.json({ user: publicUser(user) });
})];

export const logout = asyncHandler(async (req, res) => {
  await writeAudit(req, { action: 'logout', resource: 'user', resourceId: req.user?.id });
  clearSession(res);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ user: publicUser(user) });
});

export const personas = asyncHandler(async (req, res) => {
  if (!env.demoMode) throw httpError(404, 'Not found');
  const users = await User.find({ demoPersona: true, role: ROLES.CUSTOMER }).lean();
  const customers = await Customer.find({ _id: { $in: users.map((user) => user.customerId) } }).lean();
  const byId = new Map(customers.map((customer) => [String(customer._id), customer]));
  res.json({
    personas: users.map((user) => {
      const customer = byId.get(String(user.customerId));
      return {
        email: user.email,
        name: customer?.fullName || user.name,
        city: customer?.city,
        segment: customer?.segment,
        blurb: customer?.blurb,
        jurisdiction: customer?.jurisdiction,
      };
    }),
  });
});

export const demoEnter = asyncHandler(async (req, res) => {
  if (!env.demoMode) throw httpError(404, 'Not found');
  const body = parse(z.object({ email: z.string().email() }), req.body);
  const user = await User.findOne({ email: body.email.toLowerCase(), demoPersona: true, role: ROLES.CUSTOMER, status: 'active' });
  if (!user) throw httpError(404, 'Persona not available');
  setSession(res, signToken(user));
  await writeAudit(req, { action: 'demo_enter', resource: 'user', resourceId: user._id, actorId: user._id, actorName: user.name, actorRole: user.role, tenantId: user.tenantId });
  res.json({ user: publicUser(user) });
});

export const staffDirectory = asyncHandler(async (req, res) => {
  if (!env.demoMode) throw httpError(404, 'Not found');
  const users = await User.find({ role: { $ne: ROLES.CUSTOMER }, status: 'active' }).select('name email role branchId').lean();
  res.json({
    passwordHint: 'Los@Demo2026',
    staff: users.map((user) => ({ name: user.name, email: user.email, role: user.role, branchId: user.branchId })),
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ tenantId: req.user.tenantId }).select('-passwordHash').lean();
  res.json({ users });
});

export const createUser = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(10),
    role: z.string(),
    branchId: z.string().optional(),
    doaLimit: z.number().optional(),
  }), req.body);
  if (!Object.values(ROLES).includes(body.role) || body.role === ROLES.CUSTOMER) {
    throw httpError(400, 'Choose a staff role');
  }
  const passwordHash = await hashPassword(body.password);
  const user = await User.create({ ...body, passwordHash, tenantId: req.user.tenantId, email: body.email.toLowerCase() });
  await writeAudit(req, { action: 'user_create', resource: 'user', resourceId: user._id, detail: { role: user.role } });
  res.status(201).json({ user: publicUser(user) });
});
