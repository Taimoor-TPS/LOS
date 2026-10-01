import bcrypt from 'bcryptjs';
import { httpError } from './http.js';

const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

export function assertPasswordPolicy(password) {
  if (!POLICY.test(password || '')) {
    throw httpError(400, 'Password must be at least 10 characters and include upper, lower, number and symbol');
  }
}

export async function hashPassword(password) {
  assertPasswordPolicy(password);
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
