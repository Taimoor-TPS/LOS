import mongoose from 'mongoose';

const signalSchema = new mongoose.Schema(
  {
    tenantId: String,
    customerId: { type: mongoose.Schema.Types.ObjectId, index: true },
    code: String,
    severity: String,
    title: String,
    detail: String,
    recommendedAction: String,
    status: { type: String, default: 'open', index: true },
    acknowledgedBy: String,
    acknowledgedAt: Date,
  },
  { timestamps: true },
);

export const EarlyWarning = mongoose.model('EarlyWarning', signalSchema);
