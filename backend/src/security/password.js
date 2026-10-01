import bcrypt from 'bcryptjs';
import { httpError } from './http.js';

const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export function assertPasswordPolicy(password) {
  if (!POLICY.test(password || '')) {
    throw httpError(400, 'Password must be at least 12 characters and include upper, lower, digit and symbol', { code: 'PASSWORD_POLICY' });
  }
}

export async function hashPassword(password) {
  assertPasswordPolicy(password);
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash || '');
}

export async function assertNotReused(password, history = []) {
  const recent = (history || []).slice(-5);
  for (const hash of recent) {
    if (await verifyPassword(password, hash)) {
      throw httpError(400, 'Choose a password that is not one of your last 5', { code: 'PASSWORD_REUSE' });
    }
  }
}
