import mongoose from 'mongoose';
import { scopeIdentity } from '../../../engine/configurationEngine.js';

const configSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true },
    scope: {
      level: { type: String, default: 'system' },
      jurisdiction: String,
      tenantId: String,
      entityId: String,
      segment: String,
      productCode: String,
      channel: String,
    },
    scopeKey: { type: String, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    version: { type: Number, default: 1 },
    status: { type: String, default: 'draft', index: true },
    comment: String,
    makerId: String,
    makerName: String,
    checkerId: String,
    checkerName: String,
    approvedAt: Date,
    effectiveFrom: Date,
    effectiveTo: Date,
  },
  { timestamps: true },
);

configSchema.pre('validate', function stampScope() {
  this.scopeKey = scopeIdentity(this.scope || {});
});

export const ConfigEntry = mongoose.model('ConfigEntry', configSchema);
