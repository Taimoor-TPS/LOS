import mongoose from 'mongoose';

const schemeSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    name: String,
    authority: String,
    jurisdiction: String,
    productCodes: [String],
    coveragePercent: Number,
    maxAmount: Number,
    eligibilityNote: String,
    reportingCode: String,
    status: { type: String, default: 'active' },
    illustrative: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Scheme = mongoose.model('Scheme', schemeSchema);
