import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    tenantId: { type: String, index: true },
    actorId: String,
    actorName: String,
    actorRole: String,
    action: { type: String, index: true },
    resource: { type: String, index: true },
    resourceId: { type: String, index: true },
    detail: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditSchema);
