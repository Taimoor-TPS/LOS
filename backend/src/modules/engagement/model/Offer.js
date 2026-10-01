import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    tenantId: String,
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    productCode: String,
    campaignId: { type: mongoose.Schema.Types.ObjectId },
    limit: Number,
    tenorMonths: Number,
    currency: { type: String, default: 'PKR' },
    status: { type: String, default: 'issued', index: true },
    propensity: Number,
    holdout: { type: Boolean, default: false },
    channel: String,
    message: String,
    validUntil: Date,
    viewedAt: Date,
    convertedAt: Date,
  },
  { timestamps: true },
);

export const Offer = mongoose.model('Offer', offerSchema);

const campaignSchema = new mongoose.Schema(
  {
    tenantId: String,
    name: String,
    segment: String,
    channel: String,
    productCode: String,
    message: String,
    discountRate: { type: Number, default: 0 },
    status: { type: String, default: 'draft' },
    frequencyCap: { type: Number, default: 2 },
    holdoutPercent: { type: Number, default: 10 },
    lastRun: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const Campaign = mongoose.model('Campaign', campaignSchema);
