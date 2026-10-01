import { AuditLog } from '../model/AuditLog.js';
import { Application } from '../../applications/model/Application.js';
import { asyncHandler } from '../../../security/http.js';

export const audit = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.user.tenantId };
  if (req.query.action) filter.action = String(req.query.action);
  if (req.query.resource) filter.resource = String(req.query.resource);
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ logs });
});

export const screening = asyncHandler(async (req, res) => {
  const applications = await Application.find({
    tenantId: req.user.tenantId,
    $or: [{ 'screening.pep': true }, { 'screening.sanctions': true }],
  }).lean();
  res.json({ cases: applications });
});
