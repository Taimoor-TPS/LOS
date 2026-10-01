import crypto from 'crypto';
import { env } from '../config/env.js';

let cachedKey;

function key() {
  if (!cachedKey) cachedKey = crypto.scryptSync(env.dataKey, 'tps-los-v1', 32);
  return cachedKey;
}

export function encryptField(plain) {
  if (plain == null || plain === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptField(payload) {
  if (!payload) return '';
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function maskCnic(last4) {
  return last4 ? `•••••-•••••••-${last4}` : '—';
}

export function last4(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.slice(-4);
}
