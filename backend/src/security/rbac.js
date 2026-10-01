import { User, Role, Permission, SodRule } from '../modules/identity/model/User.js';
import { ConfigEntry } from '../modules/configuration/model/ConfigEntry.js';
import { permissionRecords, PERMISSION_CODES } from './permissions.js';
import { httpError } from './http.js';

const DEV_RANK = { NONE: 0, D1: 1, D2: 2, D3: 3 };

export async function syncCatalogue() {
  for (const row of permissionRecords()) {
    await Permission.updateOne({ code: row.code }, { $set: row }, { upsert: true });
  }
  await Role.updateOne(
    { code: 'SUPER_ADMIN' },
    {
      $set: {
        name: 'Super administrator',
        description: 'System role with every permission',
        type: 'ADMIN',
        permissions: PERMISSION_CODES,
        maxScope: 'ALL',
        isSystem: true,
        status: 'ACTIVE',
        doa: [{
          productFamily: '*',
          maxAmount: 999999999999,
          maxExposure: 999999999999,
          maxDeviationLevel: 'D3',
          maxRateConcessionBps: 10000,
          maxFeeWaiverPct: 100,
          maxTenorMonths: 360,
        }],
      },
    },
    { upsert: true },
  );
}

export async function isSingleCheckerMode(permission, makerId) {
  const roles = await Role.find({ permissions: permission, status: 'ACTIVE', deletedAt: null }).select('_id').lean();
  const others = await User.countDocuments({
    status: 'ACTIVE',
    deletedAt: null,
    _id: { $ne: makerId || null },
    'roles.roleId': { $in: roles.map((role) => role._id) },
  });
  return others === 0;
}

export async function selfAuthorisationAllowed() {
  const entry = await ConfigEntry.findOne({ key: 'security.allowSelfAuthorisation', status: 'active' }).lean();
  return entry ? entry.value?.enabled !== false : true;
}

export async function checkSoD(user, permission, record, { reason } = {}) {
  const rules = await SodRule.find({ status: 'ACTIVE', deletedAt: null, $or: [{ permissionB: permission }, { permissionA: permission }] }).lean();
  for (const rule of rules) {
    if (rule.level === 'USER' && rule.action === 'BLOCK') {
      const holdsBoth = user.permissions?.includes(rule.permissionA) && user.permissions?.includes(rule.permissionB);
      if (holdsBoth && !user.permissions?.includes('rbac:manage_roles')) {
        throw httpError(403, rule.description || 'Segregation of duties blocks this action', { code: 'SOD_BLOCK' });
      }
    }
    if (rule.level === 'CASE' && rule.action === 'BLOCK' && (rule.permissionB === permission || rule.permissionA === permission)) {
      const maker = String(record?.createdBy || record?.makerId || '');
      if (maker && maker === user.id) {
        const single = await isSingleCheckerMode(permission, maker);
        const allowed = await selfAuthorisationAllowed();
        if (single && allowed) {
          if (!reason) throw httpError(400, 'A reason is required to self-authorise', { code: 'REASON_REQUIRED' });
          return { selfAuthorised: true };
        }
        throw httpError(403, 'You cannot approve an item you created', { code: 'SOD_BLOCK' });
      }
    }
  }
  return { selfAuthorised: false };
}

export function checkDoA(user, application) {
  const family = application.productFamily || application.family || '*';
  const rows = (user.doa || []).filter((row) => row.productFamily === '*' || row.productFamily === family || row.productFamily === application.productCode);
  if (!rows.length) {
    throw httpError(403, 'No delegation of authority for this product', { code: 'DOA_EXCEEDED', details: { requiredLevel: 'D3' } });
  }
  const maxAmount = Math.max(...rows.map((row) => Number(row.maxAmount) || 0));
  const maxLevel = rows.reduce((best, row) => ((DEV_RANK[row.maxDeviationLevel] || 0) > (DEV_RANK[best] || 0) ? row.maxDeviationLevel : best), 'NONE');
  const exposure = Number(application.totalExposure ?? application.amount ?? 0);
  const level = application.highestDeviationLevel || 'NONE';
  if (exposure > maxAmount || (DEV_RANK[level] || 0) > (DEV_RANK[maxLevel] || 0)) {
    throw httpError(403, 'This case is above your delegation of authority', {
      code: 'DOA_EXCEEDED',
      details: { requiredLevel: (DEV_RANK[level] || 0) > (DEV_RANK[maxLevel] || 0) ? level : 'AMOUNT', maxAmount },
    });
  }
}

export async function sodWarnings(permissions) {
  const rules = await SodRule.find({ status: 'ACTIVE', deletedAt: null }).lean();
  return rules
    .filter((rule) => permissions.includes(rule.permissionA) && permissions.includes(rule.permissionB))
    .map((rule) => ({ code: rule.code, message: rule.description || `${rule.permissionA} conflicts with ${rule.permissionB}` }));
}
