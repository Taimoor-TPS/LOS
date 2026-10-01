import mongoose from 'mongoose';

const modelCardSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    name: String,
    purpose: String,
    owner: String,
    status: { type: String, default: 'champion' },
    dataUsed: [String],
    limits: String,
    metrics: { gini: Number, ks: Number, psi: Number, overrideRate: Number },
    fairness: String,
    validator: String,
    validatedAt: Date,
    monitoring: String,
  },
  { timestamps: true },
);

export const ModelCard = mongoose.model('ModelCard', modelCardSchema);
