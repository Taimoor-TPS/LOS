import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema(
  {
    code: String,
    title: String,
    required: Boolean,
    status: { type: String, default: 'pending' },
    evidence: String,
    completedBy: String,
    completedAt: Date,
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    tenantId: { type: String, index: true },
    reference: { type: String, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    productCode: { type: String, index: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    channel: { type: String, default: 'app' },
    branchId: String,
    dealerId: String,
    jurisdiction: { type: String, default: 'PK' },
    contractType: String,
    currency: { type: String, default: 'PKR' },
    amount: Number,
    tenorMonths: Number,
    indicativeRate: Number,
    indicativeInstalment: Number,
    status: { type: String, default: 'draft', index: true },
    kycStatus: { type: String, default: 'pending' },
    duplicateCount: { type: Number, default: 0 },
    deviceRiskScore: { type: Number, default: 12 },
    screening: { sanctions: Boolean, pep: Boolean, adverseMedia: Boolean, provider: String },
    bureau: { score: Number, worstDpd: Number, writeOff: Boolean, enquiries: Number, source: String, pulledAt: Date },
    incomeVerified: Boolean,
    incomeSource: String,
    sequence: [stepSchema],
    decision: { type: mongoose.Schema.Types.Mixed },
    decisionId: { type: mongoose.Schema.Types.ObjectId },
    notes: [{ by: String, role: String, text: String, at: Date }],
    votes: [{ by: String, role: String, vote: String, comment: String, at: Date }],
    pendingSecondApproval: { type: Boolean, default: false },
    kfs: { type: mongoose.Schema.Types.Mixed },
    kfsAcceptedAt: Date,
    signedAt: Date,
    otpHash: String,
    disbursedAt: Date,
    loanId: { type: mongoose.Schema.Types.ObjectId },
    asset: { description: String, value: Number },
    assignedTo: String,
    submittedAt: Date,
    decidedAt: Date,
    slaDueAt: Date,
    schemeCode: String,
    stage: { type: String, default: 'S0', index: true },
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    formCode: String,
    formVersion: Number,
    workflowCode: String,
    productVersion: Number,
    productFamily: String,
    riskFlags: { type: [String], default: [] },
    totalExposure: Number,
    highestDeviationLevel: { type: String, default: 'NONE' },
    offer: mongoose.Schema.Types.Mixed,
    consents: { type: [mongoose.Schema.Types.Mixed], default: [] },
    checklist: { type: [mongoose.Schema.Types.Mixed], default: [] },
    version: { type: Number, default: 1 },
    createdBy: String,
    updatedBy: String,
    deletedAt: Date,
    deletedBy: String,
    cancelReason: String,
    preScreen: mongoose.Schema.Types.Mixed,
    assessedIncome: Number,
    assessedIncomeReason: String,
    selfAuthorised: { type: Boolean, default: false },
    selfAuthReason: String,
  },
  { timestamps: true },
);

function hideSecrets(doc, ret) {
  delete ret.otpHash;
  return ret;
}

applicationSchema.set('toJSON', { transform: hideSecrets });
applicationSchema.set('toObject', { transform: hideSecrets });

export const Application = mongoose.model('Application', applicationSchema);

const decisionSchema = new mongoose.Schema(
  {
    tenantId: String,
    applicationId: { type: mongoose.Schema.Types.ObjectId, index: true },
    type: { type: String, default: 'auto' },
    outcome: String,
    mode: String,
    snapshot: { type: mongoose.Schema.Types.Mixed },
    inputs: { type: mongoose.Schema.Types.Mixed },
    versions: { type: mongoose.Schema.Types.Mixed },
    actorId: String,
    actorName: String,
    justification: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const DecisionRecord = mongoose.model('DecisionRecord', decisionSchema);

const counterSchema = new mongoose.Schema({ _id: String, seq: Number });
export const Counter = mongoose.model('Counter', counterSchema);

export async function nextReference() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'application' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  const year = new Date().getFullYear();
  return `APP-${year}-${String(counter.seq).padStart(8, '0')}`;
}
