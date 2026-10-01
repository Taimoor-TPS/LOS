import crypto from 'crypto';
import { identityFromId } from '../engine/platformEngine.js';
import { IntegrationConfig, IntegrationLog, MockNadra } from '../models/platformModels.js';
import { hashPayload } from '../services/accounting.js';
import { httpError } from '../security/http.js';

async function logCall(code, request, summary, status, started) {
  await IntegrationLog.create({
    code,
    requestHash: hashPayload(request),
    responseSummary: summary,
    latencyMs: Date.now() - started,
    status,
    cost: 0,
  });
}

async function active(code) {
  const row = await IntegrationConfig.findOne({ code, deletedAt: null }).lean();
  return row || { code, implementation: 'mock', enabled: true, fallback: 'MANUAL' };
}

export async function verifyIdentity(cnic) {
  const started = Date.now();
  const cfg = await active('IDENTITY');
  const profile = identityFromId(cnic);
  if (!cfg.enabled) throw httpError(503, 'Identity adapter is disabled');
  if (cfg.implementation === 'http') {
    await logCall('IDENTITY', { cnic: 'hash' }, { mode: 'http', note: 'Placeholder adapter is not connected' }, 'SKIPPED', started);
    throw httpError(501, 'HTTP identity adapter is not configured with a live endpoint');
  }
  const hash = crypto.createHash('sha256').update(String(cnic).replace(/\D/g, '')).digest('hex');
  const known = await MockNadra.findOne({ cnicHash: hash }).lean();
  const digits = String(cnic).replace(/\D/g, '');
  const generated = known || {
    fullName: `Citizen ${digits.slice(-4)}`,
    fatherName: `Parent ${digits.slice(-3)}`,
    dateOfBirth: `1990-${String((Number(digits.slice(-2)) % 12) + 1).padStart(2, '0')}-15`,
    gender: Number(digits.slice(-1)) % 2 ? 'F' : 'M',
    address: 'House 12, Block B, Clifton, Karachi',
  };
  const result = { ...profile, ...generated, cnic: digits };
  await logCall('IDENTITY', { hash }, { cardStatus: result.cardStatus, flag: result.flag }, 'OK', started);
  return result;
}

export async function pullBureau(cnic, { hard = false } = {}) {
  const started = Date.now();
  const cfg = await active('BUREAU');
  const profile = identityFromId(cnic);
  if (profile.bureau === 'timeout') {
    await logCall('BUREAU', { hard }, { timeout: true }, 'TIMEOUT', started);
    if (cfg.fallback === 'HARD_STOP') return { unavailable: true, hardStop: true, score: 0 };
    return { unavailable: true, fallback: cfg.fallback || 'MANUAL', score: 0 };
  }
  const score = profile.bureauScore || (profile.bureau === 'clear' ? 710 : 500);
  const result = {
    score: profile.flag === 'WRITE_OFF_HIT' ? 420 : score,
    writeOff: profile.flag === 'WRITE_OFF_HIT',
    worstDpd: profile.flag === 'WRITE_OFF_HIT' ? 400 : 0,
    hard,
    source: 'mock-bureau',
  };
  await logCall('BUREAU', { hard }, { score: result.score, writeOff: result.writeOff }, 'OK', started);
  return result;
}

export async function screenAml(cnic) {
  const started = Date.now();
  const profile = identityFromId(cnic);
  const result = {
    sanctionsPotential: profile.flag === 'SANCTIONS_POTENTIAL',
    pep: false,
    provider: 'mock-aml',
  };
  await logCall('AML', { cnic: 'hash' }, result, 'OK', started);
  return result;
}

export async function sendPayment({ amount, method, reference }) {
  const started = Date.now();
  const result = { status: 'ACCEPTED', method: method || 'LINKED_ACCOUNT', reference, provider: 'mock-payment' };
  await logCall('PAYMENT', { amount, method }, result, 'OK', started);
  return result;
}

export async function testAdapter(code, sample = {}) {
  if (code === 'IDENTITY') return verifyIdentity(sample.cnic || '352020000000001');
  if (code === 'BUREAU') return pullBureau(sample.cnic || '352020000000001', { hard: true });
  if (code === 'AML') return screenAml(sample.cnic || '352020000000001');
  if (code === 'PAYMENT') return sendPayment({ amount: 1000, method: 'LINKED_ACCOUNT', reference: 'TEST' });
  const started = Date.now();
  await logCall(code, sample, { ok: true, implementation: 'mock' }, 'OK', started);
  return { ok: true, code };
}
