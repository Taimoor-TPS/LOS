import { AuditLog } from '../modules/compliance/model/AuditLog.js';

function snapshot(value) {
  if (!value) return undefined;
  const raw = typeof value.toObject === 'function' ? value.toObject() : { ...value };
  delete raw.passwordHash;
  delete raw.passwordHistory;
  delete raw.mfa;
  delete raw.otpHash;
  return raw;
}

export async function writeAudit(req, event) {
  await AuditLog.create({
    tenantId: event.tenantId || req.user?.tenantId || 'noor-horizon',
    actorId: req.user?.id || event.actorId || '',
    actorName: req.user?.name || event.actorName || 'system',
    actorRole: req.user?.principal || event.actorRole || 'system',
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId ? String(event.resourceId) : '',
    before: event.before ? snapshot(event.before) : undefined,
    after: event.after ? snapshot(event.after) : undefined,
    reason: event.reason || '',
    detail: event.detail || {},
    ip: req.ip || req.headers?.['x-forwarded-for'] || '',
  });
}
