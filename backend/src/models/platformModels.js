import mongoose from 'mongoose';

const versioned = {
  version: { type: Number, default: 1 },
  status: { type: String, default: 'ACTIVE' },
  deletedAt: Date,
  deletedBy: String,
  createdBy: String,
  updatedBy: String,
};

const fieldSchema = new mongoose.Schema({
  fieldCode: { type: String, unique: true },
  label: { type: mongoose.Schema.Types.Mixed, default: {} },
  dataType: String,
  entityScope: String,
  validation: { type: mongoose.Schema.Types.Mixed, default: {} },
  mask: String,
  defaultValue: mongoose.Schema.Types.Mixed,
  source: { type: String, default: 'USER_INPUT' },
  computation: String,
  lookupList: String,
  piiClass: { type: String, default: 'NONE' },
  isSystem: { type: Boolean, default: false },
  ...versioned,
}, { timestamps: true });
export const FieldDefinition = mongoose.model('FieldDefinition', fieldSchema);

const formSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  binding: { type: mongoose.Schema.Types.Mixed, default: {} },
  sections: { type: [mongoose.Schema.Types.Mixed], default: [] },
  publishedVersion: { type: Number, default: 0 },
  ...versioned,
}, { timestamps: true });
export const Form = mongoose.model('Form', formSchema);

const formVersionSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, index: true },
  code: String,
  version: Number,
  hash: String,
  binding: mongoose.Schema.Types.Mixed,
  sections: mongoose.Schema.Types.Mixed,
  publishedAt: Date,
  publishedBy: String,
}, { timestamps: true });
export const FormVersion = mongoose.model('FormVersion', formVersionSchema);

const workflowSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  stages: { type: [mongoose.Schema.Types.Mixed], default: [] },
  transitions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  publishedVersion: { type: Number, default: 0 },
  ...versioned,
}, { timestamps: true });
export const Workflow = mongoose.model('Workflow', workflowSchema);

const workflowVersionSchema = new mongoose.Schema({
  workflowId: { type: mongoose.Schema.Types.ObjectId, index: true },
  code: String,
  version: Number,
  stages: mongoose.Schema.Types.Mixed,
  transitions: mongoose.Schema.Types.Mixed,
  hash: String,
}, { timestamps: true });
export const WorkflowVersion = mongoose.model('WorkflowVersion', workflowVersionSchema);

const masterSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  values: { type: [mongoose.Schema.Types.Mixed], default: [] },
  ...versioned,
}, { timestamps: true });
export const MasterList = mongoose.model('MasterList', masterSchema);

const templateSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  channel: String,
  kind: String,
  subject: String,
  body: String,
  locale: { type: String, default: 'en' },
  ...versioned,
}, { timestamps: true });
export const Template = mongoose.model('Template', templateSchema);

const escalationRuleSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  trigger: String,
  clockHours: Number,
  levels: { type: [mongoose.Schema.Types.Mixed], default: [] },
  ...versioned,
}, { timestamps: true });
export const EscalationRule = mongoose.model('EscalationRule', escalationRuleSchema);

const escalationSchema = new mongoose.Schema({
  ruleCode: String,
  resource: String,
  resourceId: String,
  level: Number,
  status: { type: String, default: 'OPEN' },
  recipientPermission: String,
}, { timestamps: true });
export const EscalationInstance = mongoose.model('EscalationInstance', escalationSchema);

const branchSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  regionCode: String,
  entityId: { type: String, default: 'PK-01' },
  ...versioned,
}, { timestamps: true });
export const Branch = mongoose.model('Branch', branchSchema);

const entitySchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  currency: { type: String, default: 'PKR' },
  businessDate: String,
  ...versioned,
}, { timestamps: true });
export const Entity = mongoose.model('Entity', entitySchema);

const holidaySchema = new mongoose.Schema({
  entityId: String,
  date: String,
  name: String,
  ...versioned,
}, { timestamps: true });
export const Holiday = mongoose.model('Holiday', holidaySchema);

const reportSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  purpose: String,
  dataSource: String,
  columns: { type: [mongoose.Schema.Types.Mixed], default: [] },
  filters: { type: [mongoose.Schema.Types.Mixed], default: [] },
  grouping: { type: [String], default: [] },
  ...versioned,
}, { timestamps: true });
export const ReportDefinition = mongoose.model('ReportDefinition', reportSchema);

const documentSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, index: true },
  code: String,
  label: String,
  required: { type: Boolean, default: true },
  status: { type: String, default: 'PENDING' },
  fileName: String,
  mime: String,
  size: Number,
  sha256: String,
  storagePath: String,
  rejectReason: String,
  verifiedBy: String,
  verifiedAt: Date,
  version: { type: Number, default: 1 },
  deletedAt: Date,
  deletedBy: String,
}, { timestamps: true });
export const DocumentFile = mongoose.model('DocumentFile', documentSchema);

const collateralSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, index: true },
  type: String,
  description: String,
  value: Number,
  lien: { type: Boolean, default: false },
  ...versioned,
}, { timestamps: true });
export const Collateral = mongoose.model('Collateral', collateralSchema);

const deviationSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, index: true },
  code: String,
  ruleCode: String,
  level: { type: String, default: 'D1' },
  reason: String,
  status: { type: String, default: 'OPEN' },
  justification: String,
  decidedBy: String,
  decidedAt: Date,
  version: { type: Number, default: 1 },
}, { timestamps: true });
export const Deviation = mongoose.model('Deviation', deviationSchema);

const notificationSchema = new mongoose.Schema({
  recipientType: String,
  recipientId: { type: String, index: true },
  eventCode: String,
  title: String,
  body: String,
  href: String,
  readAt: Date,
}, { timestamps: true });
export const Notification = mongoose.model('Notification', notificationSchema);

const outboxSchema = new mongoose.Schema({
  channel: String,
  to: { type: String, index: true },
  eventCode: String,
  body: String,
  status: { type: String, default: 'QUEUED' },
  sentAt: Date,
}, { timestamps: true });
export const Outbox = mongoose.model('Outbox', outboxSchema);

const complaintSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, index: true },
  reference: String,
  subject: String,
  body: String,
  status: { type: String, default: 'OPEN' },
  slaDueAt: Date,
  resolution: String,
  version: { type: Number, default: 1 },
}, { timestamps: true });
export const Complaint = mongoose.model('Complaint', complaintSchema);

const historySchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, index: true },
  fromStage: String,
  toStage: String,
  outcome: String,
  reasonCode: String,
  comments: String,
  actorId: String,
  actorName: String,
  customerMilestone: String,
  at: { type: Date, default: Date.now },
}, { timestamps: false });
export const StageHistory = mongoose.model('StageHistory', historySchema);

const messageSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, index: true },
  from: String,
  body: String,
  internal: { type: Boolean, default: false },
}, { timestamps: true });
export const ApplicationMessage = mongoose.model('ApplicationMessage', messageSchema);

const eligibilitySchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, index: true },
  productCode: String,
  input: mongoose.Schema.Types.Mixed,
  result: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
export const EligibilityCheck = mongoose.model('EligibilityCheck', eligibilitySchema);

const registrationSchema = new mongoose.Schema({
  mobile: { type: String, index: true },
  cnicHash: String,
  cnicEncrypted: String,
  otpHash: String,
  otpExpires: Date,
  resends: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  lockedUntil: Date,
  status: { type: String, default: 'PENDING' },
  customerId: { type: mongoose.Schema.Types.ObjectId },
  consentAt: Date,
}, { timestamps: true });
export const Registration = mongoose.model('Registration', registrationSchema);

const credentialSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, unique: true },
  mobile: { type: String, unique: true },
  cnicHash: { type: String, index: true },
  passwordHash: String,
  mpinHash: String,
  deviceId: String,
  status: { type: String, default: 'ACTIVE' },
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
}, { timestamps: true });
export const CustomerCredential = mongoose.model('CustomerCredential', credentialSchema);

const nadraSchema = new mongoose.Schema({
  cnicHash: { type: String, unique: true },
  cnicLast4: String,
  fullName: String,
  fatherName: String,
  dateOfBirth: String,
  gender: String,
  address: String,
}, { timestamps: true });
export const MockNadra = mongoose.model('MockNadra', nadraSchema);

const negativeSchema = new mongoose.Schema({
  cnicHash: { type: String, index: true },
  reason: String,
  source: String,
}, { timestamps: true });
export const NegativeList = mongoose.model('NegativeList', negativeSchema);

const jobSchema = new mongoose.Schema({
  type: String,
  payload: mongoose.Schema.Types.Mixed,
  status: { type: String, default: 'QUEUED', index: true },
  error: String,
  attempts: { type: Number, default: 0 },
}, { timestamps: true });
export const Job = mongoose.model('Job', jobSchema);

const glAccountSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  type: String,
  currency: { type: String, default: 'PKR' },
  memo: { type: Boolean, default: false },
  ...versioned,
}, { timestamps: true });
export const GLAccount = mongoose.model('GLAccount', glAccountSchema);

const accountingTemplateSchema = new mongoose.Schema({
  eventCode: { type: String, unique: true },
  name: String,
  condition: String,
  legs: { type: [mongoose.Schema.Types.Mixed], default: [] },
  ...versioned,
}, { timestamps: true });
export const AccountingTemplate = mongoose.model('AccountingTemplate', accountingTemplateSchema);

const journalSchema = new mongoose.Schema({
  reference: { type: String, unique: true },
  eventCode: String,
  entityId: String,
  branchId: String,
  productCode: String,
  currency: { type: String, default: 'PKR' },
  valueDate: String,
  businessDate: String,
  narration: String,
  lines: { type: [mongoose.Schema.Types.Mixed], default: [] },
  status: { type: String, default: 'POSTED' },
  reversalOf: { type: mongoose.Schema.Types.ObjectId },
  makerId: String,
  checkerId: String,
  selfAuthorised: { type: Boolean, default: false },
  reason: String,
  loanTransactionId: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });
export const Journal = mongoose.model('Journal', journalSchema);

const balanceSchema = new mongoose.Schema({
  date: String,
  gl: String,
  debit: Number,
  credit: Number,
}, { timestamps: true });
balanceSchema.index({ date: 1, gl: 1 });
export const GLBalanceDaily = mongoose.model('GLBalanceDaily', balanceSchema);

const tbSchema = new mongoose.Schema({
  businessDate: String,
  trialBalance: mongoose.Schema.Types.Mixed,
  checks: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
export const TBSnapshot = mongoose.model('TBSnapshot', tbSchema);

const reconSchema = new mongoose.Schema({
  businessDate: String,
  code: String,
  passed: Boolean,
  expected: Number,
  actual: Number,
  detail: String,
  accepted: { type: Boolean, default: false },
}, { timestamps: true });
export const ReconBreak = mongoose.model('ReconBreak', reconSchema);

const eodSchema = new mongoose.Schema({
  date: { type: String, index: true },
  status: { type: String, default: 'RUNNING' },
  steps: { type: [mongoose.Schema.Types.Mixed], default: [] },
  startedAt: Date,
  endedAt: Date,
}, { timestamps: true });
export const EodRun = mongoose.model('EodRun', eodSchema);

const txnSchema = new mongoose.Schema({
  loanId: { type: mongoose.Schema.Types.ObjectId, index: true },
  type: String,
  valueDate: String,
  businessDate: String,
  amount: Number,
  components: mongoose.Schema.Types.Mixed,
  channel: String,
  idempotencyKey: { type: String, unique: true, sparse: true },
  reversalOf: { type: mongoose.Schema.Types.ObjectId },
  journalId: { type: mongoose.Schema.Types.ObjectId },
  status: { type: String, default: 'POSTED' },
}, { timestamps: true });
export const LoanTransaction = mongoose.model('LoanTransaction', txnSchema);

const caseSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, index: true },
  loanId: { type: mongoose.Schema.Types.ObjectId, index: true },
  dpd: Number,
  bucket: String,
  strategy: String,
  queue: String,
  assigneeId: String,
  flags: { type: [String], default: [] },
  status: { type: String, default: 'OPEN' },
  version: { type: Number, default: 1 },
}, { timestamps: true });
export const CollectionCase = mongoose.model('CollectionCase', caseSchema);

const actionSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, index: true },
  channel: String,
  contactPerson: String,
  resultCode: String,
  delayReason: String,
  notes: String,
  actorId: String,
  at: { type: Date, default: Date.now },
}, { timestamps: true });
export const CollectionAction = mongoose.model('CollectionAction', actionSchema);

const ptpSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, index: true },
  amount: Number,
  promiseDate: String,
  status: { type: String, default: 'OPEN' },
  notes: String,
}, { timestamps: true });
export const PTP = mongoose.model('PTP', ptpSchema);

const settlementSchema = new mongoose.Schema({
  caseId: { type: mongoose.Schema.Types.ObjectId, index: true },
  loanId: { type: mongoose.Schema.Types.ObjectId },
  amount: Number,
  status: { type: String, default: 'PROPOSED' },
  reason: String,
  makerId: String,
  checkerId: String,
  selfAuthorised: Boolean,
  version: { type: Number, default: 1 },
}, { timestamps: true });
export const Settlement = mongoose.model('Settlement', settlementSchema);

const regimeSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  bands: { type: [mongoose.Schema.Types.Mixed], default: [] },
  ifrs: { type: mongoose.Schema.Types.Mixed, default: {} },
  pdLgd: { type: mongoose.Schema.Types.Mixed, default: {} },
  ...versioned,
}, { timestamps: true });
export const ClassificationRegime = mongoose.model('ClassificationRegime', regimeSchema);

const integrationSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  domain: String,
  implementation: { type: String, default: 'mock' },
  enabled: { type: Boolean, default: true },
  fallback: { type: String, default: 'MANUAL' },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  ...versioned,
}, { timestamps: true });
export const IntegrationConfig = mongoose.model('IntegrationConfig', integrationSchema);

const logSchema = new mongoose.Schema({
  code: { type: String, index: true },
  requestHash: String,
  responseSummary: mongoose.Schema.Types.Mixed,
  latencyMs: Number,
  status: String,
  cost: { type: Number, default: 0 },
}, { timestamps: true });
export const IntegrationLog = mongoose.model('IntegrationLog', logSchema);

const productVersionSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, index: true },
  code: String,
  version: Number,
  snapshot: mongoose.Schema.Types.Mixed,
  publishedAt: Date,
}, { timestamps: true });
export const ProductVersion = mongoose.model('ProductVersion', productVersionSchema);
