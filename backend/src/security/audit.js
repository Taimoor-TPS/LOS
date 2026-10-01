import { AuditLog } from '../modules/compliance/model/AuditLog.js';

export async function writeAudit(req, event) {
  await AuditLog.create({
    tenantId: event.tenantId || req.user?.tenantId || 'noor-horizon',
    actorId: req.user?.id || event.actorId || '',
    actorName: req.user?.name || event.actorName || 'system',
    actorRole: req.user?.role || event.actorRole || 'system',
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId ? String(event.resourceId) : '',
    detail: event.detail || {},
    ip: req.ip || '',
  });
}
