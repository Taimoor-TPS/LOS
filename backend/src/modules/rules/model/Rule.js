import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema(
  {
    code: { type: String, index: true },
    name: String,
    stage: { type: String, default: 'eligibility' },
    ruleType: { type: String, default: 'ELIGIBILITY' },
    deviationLevel: String,
    effectiveFrom: Date,
    effectiveTo: Date,
    deletedAt: Date,
    deletedBy: String,
    priority: { type: Number, default: 100 },
    appliesTo: {
      products: { type: [String], default: ['*'] },
      segments: { type: [String], default: ['*'] },
      jurisdictions: { type: [String], default: ['*'] },
    },
    when: { type: mongoose.Schema.Types.Mixed, default: {} },
    then: { outcome: String, reasonCode: String, stop: Boolean },
    enabled: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    status: { type: String, default: 'active', index: true },
    makerId: String,
    makerName: String,
    checkerId: String,
    checkerName: String,
    comment: String,
  },
  { timestamps: true },
);

export const Rule = mongoose.model('Rule', ruleSchema);
