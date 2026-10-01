import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema(
  {
    tenantId: String,
    applicationId: { type: mongoose.Schema.Types.ObjectId },
    customerId: { type: mongoose.Schema.Types.ObjectId, index: true },
    productCode: String,
    contractType: String,
    currency: { type: String, default: 'PKR' },
    principal: Number,
    rate: Number,
    tenorMonths: Number,
    instalment: Number,
    status: { type: String, default: 'active' },
    disbursedAt: Date,
    accountMasked: String,
    rail: { type: String, default: 'Raast' },
    nextDebitDay: { type: Number, default: 5 },
    schedule: { type: [mongoose.Schema.Types.Mixed], default: [] },
    paidCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const LoanAccount = mongoose.model('LoanAccount', loanSchema);

const requestSchema = new mongoose.Schema(
  {
    tenantId: String,
    loanId: { type: mongoose.Schema.Types.ObjectId, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String, enum: ['topup', 'prepay', 'restructure'] },
    amount: Number,
    tenorMonths: Number,
    status: { type: String, default: 'submitted' },
    decision: { type: mongoose.Schema.Types.Mixed },
    preview: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const ServicingRequest = mongoose.model('ServicingRequest', requestSchema);
