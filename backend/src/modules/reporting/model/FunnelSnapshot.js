import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema(
  {
    tenantId: String,
    approvalRate: Number,
    stpRate: Number,
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const FunnelSnapshot = mongoose.model('FunnelSnapshot', snapshotSchema);
