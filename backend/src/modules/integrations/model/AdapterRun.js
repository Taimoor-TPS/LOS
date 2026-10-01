import mongoose from 'mongoose';

const runSchema = new mongoose.Schema(
  {
    tenantId: String,
    applicationId: { type: mongoose.Schema.Types.ObjectId, index: true },
    adapter: String,
    jurisdiction: String,
    status: String,
    simulated: { type: Boolean, default: true },
    summary: String,
  },
  { timestamps: true },
);

export const AdapterRun = mongoose.model('AdapterRun', runSchema);
