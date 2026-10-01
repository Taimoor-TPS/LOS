import { z } from 'zod';
import { Application, DecisionRecord, nextReference } from '../model/Application.js';
import { Customer, Consent } from '../../customers/model/Customer.js';
import { Product } from '../../products/model/Product.js';
import { Offer } from '../../engagement/model/Offer.js';
import { LoanAccount } from '../../servicing/model/LoanAccount.js';
import { AdapterRun } from '../../integrations/model/AdapterRun.js';
import { presentCustomer } from '../../customers/controller/customerController.js';
import { buildKfs } from '../../documents/controller/documentController.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { writeAudit } from '../../../security/audit.js';
import { sha256 } from '../../../security/crypto.js';
import { env } from '../../../config/env.js';
import { buildContractSchedule, quotePayment } from '../../../engine/money.js';
import { decideApplication, loadPolicy } from '../../../engine/decisionService.js';
import { completeSteps, sequenceComplete, sequenceFor } from '../../../engine/islamicEngine.js';
function isCustomer(req) {
  return req.user?.principal === 'CUSTOMER';
}

const DIGITAL_STEPS = ['kyc', 'kfs', 'esign', 'account'];

async function loadApplication(req) {
  const application = await Application.findById(req.params.id);
  if (!application) throw httpError(404, 'Application not found');
  if (isCustomer(req) && String(application.customerId) !== req.user.customerId) {
    throw httpError(403, 'You do not have access to this application');
  }
  if (req.user.dealerId && application.dealerId && application.dealerId !== req.user.dealerId) {
    throw httpError(403, 'You do not have access to this application');
  }
  return application;
}

function presentApplication(application, extras = {}) {
  return { id: application._id, ...application.toObject(), ...extras };
}

async function createLoan(application, customer, actor) {
  const decision = application.decision || {};
  const start = new Date();
  const schedule = buildContractSchedule({
    contractType: application.contractType,
    principal: application.amount,
    annualRate: decision.pricing?.rate || application.indicativeRate,
    tenorMonths: application.tenorMonths,
    payment: decision.pricing?.instalment || application.indicativeInstalment,
    start,
  });
  const loan = await LoanAccount.create({
    tenantId: application.tenantId,
    applicationId: application._id,
    customerId: customer._id,
    productCode: application.productCode,
    contractType: application.contractType,
    currency: application.currency,
    principal: application.amount,
    rate: decision.pricing?.rate || application.indicativeRate,
    tenorMonths: application.tenorMonths,
    instalment: decision.pricing?.instalment || application.indicativeInstalment,
    disbursedAt: new Date(),
    accountMasked: customer.accountMasked,
    rail: application.dealerId ? 'Dealer settlement' : 'Raast',
    schedule,
    paidCount: 0,
  });
  application.loanId = loan._id;
  application.disbursedAt = loan.disbursedAt;
  application.status = 'disbursed';
  await application.save();
  await writeAudit({ user: actor, ip: '' }, { action: 'disburse', resource: 'application', resourceId: application._id, tenantId: application.tenantId, detail: { loanId: String(loan._id) } });
  return loan;
}

export const create = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    productCode: z.string(),
    amount: z.number().positive(),
    tenorMonths: z.number().int().positive(),
    offerId: z.string().optional(),
    channel: z.string().optional(),
    customerId: z.string().optional(),
    asset: z.object({ description: z.string(), value: z.number().optional() }).optional(),
    schemeCode: z.string().optional(),
  }), req.body);

  const customerId = isCustomer(req) ? req.user.customerId : body.customerId;
  if (!customerId) throw httpError(400, 'Customer is required');
  const customer = await Customer.findById(customerId);
  if (!customer) throw httpError(404, 'Customer not found');
  const product = await Product.findOne({ code: body.productCode, status: 'active' });
  if (!product) throw httpError(404, 'Product not found');
  if (body.amount < product.minAmount || body.amount > product.maxAmount) {
    throw httpError(400, `Amount must be between ${product.minAmount} and ${product.maxAmount}`);
  }
  if (body.tenorMonths < product.minTenor || body.tenorMonths > product.maxTenor) {
    throw httpError(400, `Tenor must be between ${product.minTenor} and ${product.maxTenor} months`);
  }

  const policy = await loadPolicy({
    jurisdiction: customer.jurisdiction,
    tenantId: customer.tenantId,
    segment: customer.segment,
    productCode: product.code,
    channel: body.channel || 'app',
    entityId: customer.branchId,
  });
  const sequences = policy['islamic.sequences']?.value;
  const application = await Application.create({
    tenantId: customer.tenantId,
    reference: await nextReference(),
    customerId: customer._id,
    productCode: product.code,
    offerId: body.offerId,
    channel: body.channel || (isCustomer(req) ? 'app' : 'assisted'),
    branchId: customer.branchId,
    dealerId: req.user.dealerId || '',
    jurisdiction: customer.jurisdiction,
    contractType: product.contractType,
    currency: product.currency,
    amount: body.amount,
    tenorMonths: body.tenorMonths,
    indicativeRate: product.baseRate,
    indicativeInstalment: quotePayment(product, body.amount, product.baseRate, body.tenorMonths),
    status: 'draft',
    sequence: sequenceFor(product.contractType, sequences),
    asset: body.asset,
    schemeCode: body.schemeCode || '',
    assignedTo: isCustomer(req) ? '' : req.user.id,
  });
  await writeAudit(req, { action: 'application_create', resource: 'application', resourceId: application._id });
  res.status(201).json({ application: presentApplication(application) });
});

export const list = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.user.tenantId };
  if (isCustomer(req)) filter.customerId = req.user.customerId;
  if (req.user.dealerId) filter.dealerId = req.user.dealerId;
  if (req.query.status) filter.status = String(req.query.status);
  const applications = await Application.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
  const customers = await Customer.find({ _id: { $in: applications.map((item) => item.customerId) } }).lean();
  const names = new Map(customers.map((customer) => [String(customer._id), customer.fullName]));
  res.json({
    applications: applications.map((application) => {
      const { otpHash, ...safe } = application;
      return {
        ...safe,
        customerName: names.get(String(application.customerId)) || 'Customer',
      };
    }),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const application = await loadApplication(req);
  const customer = await Customer.findById(application.customerId).lean();
  const product = await Product.findOne({ code: application.productCode }).lean();
  const history = await DecisionRecord.find({ applicationId: application._id }).sort({ createdAt: 1 }).lean();
  res.json({
    application: presentApplication(application),
    customer: customer ? presentCustomer(customer) : null,
    product,
    decisions: history.map((row) => ({
      id: row._id,
      type: row.type,
      outcome: row.outcome,
      mode: row.mode,
      actorName: row.actorName,
      justification: row.justification,
      createdAt: row.createdAt,
      versions: row.versions,
    })),
  });
});

export const grantConsent = asyncHandler(async (req, res) => {
  const application = await loadApplication(req);
  const body = parse(z.object({
    purposes: z.array(z.enum(['identity', 'bureau', 'salary', 'open_banking', 'marketing', 'alternative_data'])).min(1),
  }), req.body);
  const expiresAt = new Date(Date.now() + 180 * 24 * 3600 * 1000);
  await Consent.insertMany(body.purposes.map((purpose) => ({
    tenantId: application.tenantId,
    customerId: application.customerId,
    applicationId: application._id,
    purpose,
    scope: purpose,
    channel: application.channel,
    expiresAt,
    actorId: req.user.id,
  })));
  await writeAudit(req, { action: 'consent_grant', resource: 'application', resourceId: application._id, detail: { purposes: body.purposes } });
  res.status(201).json({ ok: true });
});

export const verify = asyncHandler(async (req, res) => {
  const application = await loadApplication(req);
  const consents = await Consent.find({ applicationId: application._id, revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
  const purposes = new Set(consents.map((consent) => consent.purpose));
  if (!purposes.has('identity') || !purposes.has('bureau')) {
    throw httpError(400, 'Identity and bureau consent are required before verification');
  }
  const customer = await Customer.findById(application.customerId);
  const product = await Product.findOne({ code: application.productCode }).lean();
  if (customer.segment === 'thin_file' && !purposes.has('alternative_data')) {
    throw httpError(400, 'Alternative-data consent is required for this product');
  }
  if ((product.affordabilityMode === 'dbr' && customer.segment === 'salaried') && !purposes.has('salary')) {
    throw httpError(400, 'Salary-data consent is required');
  }

  const nadraOk = customer.kycStatus !== 'mismatch';
  const jurisdictionAdapter = customer.jurisdiction === 'KSA' ? 'nafath' : customer.jurisdiction === 'UAE' ? 'uae-pass' : 'nadra';
  const bureauAdapter = customer.jurisdiction === 'KSA' ? 'simah' : customer.jurisdiction === 'UAE' ? 'aecb' : 'ecib';
  await AdapterRun.create([
    { tenantId: application.tenantId, applicationId: application._id, adapter: jurisdictionAdapter, jurisdiction: customer.jurisdiction, status: nadraOk ? 'matched' : 'failed', summary: nadraOk ? 'Face match and identity record matched in the simulator.' : 'Identity did not match.' },
    { tenantId: application.tenantId, applicationId: application._id, adapter: bureauAdapter, jurisdiction: customer.jurisdiction, status: 'pulled', summary: `Bureau score ${customer.bureauScore || 'thin-file'} from the simulator.` },
    { tenantId: application.tenantId, applicationId: application._id, adapter: 'screening', jurisdiction: customer.jurisdiction, status: customer.sanctionsFlag ? 'hit' : 'clear', summary: customer.pepFlag ? 'PEP review flag' : 'Sanctions and adverse media clear' },
  ]);

  application.kycStatus = nadraOk ? 'verified' : 'failed';
  application.screening = { sanctions: customer.sanctionsFlag, pep: customer.pepFlag, adverseMedia: false, provider: 'screening-simulator' };
  application.bureau = {
    score: customer.bureauScore || 0,
    worstDpd: customer.bureauWorstDpd || 0,
    writeOff: false,
    enquiries: 1,
    source: bureauAdapter,
    pulledAt: new Date(),
  };
  application.incomeVerified = customer.segment === 'thin_file' ? customer.altDataQuality >= 50 : true;
  application.incomeSource = customer.segment === 'sme' ? 'cashflow' : customer.segment === 'thin_file' ? 'alternative_data' : 'salary_credits';
  application.status = 'verified';
  application.submittedAt = application.submittedAt || new Date();
  application.sequence = completeSteps(application.sequence, ['kyc'], 'Identity verified in the digital journey', req.user.name);
  application.markModified('sequence');
  await application.save();
  await writeAudit(req, { action: 'verify', resource: 'application', resourceId: application._id });
  res.json({ application: presentApplication(application) });
});

export const decide = asyncHandler(async (req, res) => {
  if (isCustomer(req)) throw httpError(403, 'Customers cannot decide an application');
  const application = await loadApplication(req);
  if (!['verified', 'draft', 'referred'].includes(application.status) && application.status !== 'verified') {
    if (application.decision && application.status !== 'verified') {
      throw httpError(409, 'This application already has a decision');
    }
  }
  if (application.kycStatus !== 'verified') throw httpError(400, 'Verify identity before asking for a decision');
  const customer = await Customer.findById(application.customerId);
  const { result } = await decideApplication({ application, customer, actor: req.user });
  await writeAudit(req, { action: 'decide', resource: 'application', resourceId: application._id, detail: { outcome: result.outcome, score: result.score?.score } });
  res.json({ application: presentApplication(application), decision: result });
});

export const kfs = asyncHandler(async (req, res) => {
  const application = await loadApplication(req);
  const customer = await Customer.findById(application.customerId).lean();
  const product = await Product.findOne({ code: application.productCode }).lean();
  const document = buildKfs({ application, product, customer, decision: application.decision });
  res.json({ kfs: document });
});

export const accept = asyncHandler(async (req, res) => {
  const application = await loadApplication(req);
  if (application.status !== 'approved') throw httpError(409, 'Only an approved offer can be accepted');
  const customer = await Customer.findById(application.customerId).lean();
  const product = await Product.findOne({ code: application.productCode }).lean();
  application.kfs = buildKfs({ application, product, customer, decision: application.decision });
  application.kfsAcceptedAt = new Date();
  application.status = 'accepted';
  await application.save();
  await writeAudit(req, { action: 'kfs_accept', resource: 'application', resourceId: application._id });
  res.json({ application: presentApplication(application) });
});

export const signStart = asyncHandler(async (req, res) => {
  const application = await loadApplication(req);
  if (!['accepted', 'approved'].includes(application.status)) throw httpError(409, 'Accept the key facts before signing');
  if (application.status === 'approved') {
    const customer = await Customer.findById(application.customerId).lean();
    const product = await Product.findOne({ code: application.productCode }).lean();
    application.kfs = buildKfs({ application, product, customer, decision: application.decision });
    application.kfsAcceptedAt = new Date();
    application.status = 'accepted';
  }
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  application.otpHash = sha256(`${application._id}:${otp}`);
  await application.save();
  res.json({ sent: true, channel: 'demo-inbox', demoOtp: env.demoMode ? otp : undefined });
});

export const signConfirm = asyncHandler(async (req, res) => {
  const body = parse(z.object({ otp: z.string().length(6) }), req.body);
  const application = await loadApplication(req);
  if (application.otpHash !== sha256(`${application._id}:${body.otp}`)) throw httpError(400, 'That code does not match');
  const product = await Product.findOne({ code: application.productCode }).lean();
  const customer = await Customer.findById(application.customerId);
  application.signedAt = new Date();
  application.sequence = completeSteps(application.sequence, DIGITAL_STEPS, 'Captured in the digital signing journey', req.user.name);
  application.markModified('sequence');
  const stp = application.decision?.outcome === 'approve'
    && application.decision?.mode === 'stp'
    && product.stpEligible
    && sequenceComplete(application.sequence);
  if (stp) {
    await createLoan(application, customer, req.user);
  } else {
    application.status = 'pending_fulfilment';
    await application.save();
  }
  if (application.offerId) await Offer.updateOne({ _id: application.offerId }, { status: 'converted', convertedAt: new Date() });
  await writeAudit(req, { action: 'esign', resource: 'application', resourceId: application._id, detail: { status: application.status } });
  const loan = application.loanId ? await LoanAccount.findById(application.loanId).lean() : null;
  res.json({ application: presentApplication(application), loan });
});

export const addNote = asyncHandler(async (req, res) => {
  const body = parse(z.object({ text: z.string().min(2) }), req.body);
  const application = await loadApplication(req);
  application.notes.push({ by: req.user.name, role: req.user.role, text: body.text, at: new Date() });
  await application.save();
  res.json({ application: presentApplication(application) });
});

export const override = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    outcome: z.enum(['approve', 'decline']),
    justification: z.string().min(20),
  }), req.body);
  const application = await loadApplication(req);
  if (!['referred', 'pending_second_approval'].includes(application.status)) {
    throw httpError(409, 'Only a referred case can be overridden');
  }
  if (application.amount > req.user.doaLimit) throw httpError(403, 'This amount is above your delegation');
  const policy = await loadPolicy({
    jurisdiction: application.jurisdiction,
    tenantId: application.tenantId,
    productCode: application.productCode,
    channel: application.channel,
    entityId: application.branchId,
  });
  const fourEyes = policy['doa.matrix'].value?.fourEyesAbove ?? 1000000;
  const needsSecond = body.outcome === 'approve' && application.amount > fourEyes;
  await DecisionRecord.create({
    tenantId: application.tenantId,
    applicationId: application._id,
    type: 'override',
    outcome: body.outcome,
    mode: 'manual',
    snapshot: { ...(application.decision || {}), outcome: body.outcome, mode: 'manual' },
    actorId: req.user.id,
    actorName: req.user.name,
    justification: body.justification,
  });
  application.decision = { ...(application.decision || {}), outcome: body.outcome, mode: 'manual' };
  application.pendingSecondApproval = needsSecond;
  application.status = needsSecond ? 'pending_second_approval' : (body.outcome === 'approve' ? 'approved' : 'declined');
  application.notes.push({ by: req.user.name, role: req.user.role, text: body.justification, at: new Date() });
  application.markModified('decision');
  await application.save();
  await writeAudit(req, { action: 'override', resource: 'application', resourceId: application._id, detail: { outcome: body.outcome, fourEyes: needsSecond } });
  res.json({ application: presentApplication(application) });
});

export const secondApproval = asyncHandler(async (req, res) => {
  const application = await loadApplication(req);
  if (application.status !== 'pending_second_approval') throw httpError(409, 'This case is not waiting for a second approval');
  const last = await DecisionRecord.findOne({ applicationId: application._id, type: 'override' }).sort({ createdAt: -1 });
  if (last && last.actorId === req.user.id) throw httpError(403, 'The second approver must be a different person');
  application.pendingSecondApproval = false;
  application.status = 'approved';
  application.notes.push({ by: req.user.name, role: req.user.role, text: 'Four-eyes approval recorded.', at: new Date() });
  await application.save();
  await writeAudit(req, { action: 'four_eyes', resource: 'application', resourceId: application._id });
  res.json({ application: presentApplication(application) });
});

export const vote = asyncHandler(async (req, res) => {
  const body = parse(z.object({ vote: z.enum(['approve', 'decline']), comment: z.string().min(3) }), req.body);
  const application = await loadApplication(req);
  if (application.status !== 'committee') throw httpError(409, 'This case is not with the committee');
  if (application.votes.some((item) => item.by === req.user.name)) throw httpError(409, 'You already voted');
  application.votes.push({ by: req.user.name, role: req.user.role, vote: body.vote, comment: body.comment, at: new Date() });
  const approves = application.votes.filter((item) => item.vote === 'approve').length;
  const declines = application.votes.filter((item) => item.vote === 'decline').length;
  if (approves >= 2) application.status = 'approved';
  if (declines >= 2) application.status = 'declined';
  await application.save();
  await writeAudit(req, { action: 'committee_vote', resource: 'application', resourceId: application._id, detail: { vote: body.vote } });
  res.json({ application: presentApplication(application) });
});

export const completeStep = asyncHandler(async (req, res) => {
  const body = parse(z.object({ evidence: z.string().min(3) }), req.body);
  const application = await loadApplication(req);
  const step = application.sequence.find((item) => item.code === req.params.stepCode);
  if (!step) throw httpError(404, 'Step not found');
  step.status = 'complete';
  step.evidence = body.evidence;
  step.completedBy = req.user.name;
  step.completedAt = new Date();
  application.markModified('sequence');
  await application.save();
  await writeAudit(req, { action: 'sequence_evidence', resource: 'application', resourceId: application._id, detail: { step: step.code } });
  res.json({ application: presentApplication(application) });
});

export const disburse = asyncHandler(async (req, res) => {
  const application = await loadApplication(req);
  if (!['approved', 'accepted', 'signed', 'pending_fulfilment'].includes(application.status)) {
    throw httpError(409, 'This application is not ready to disburse');
  }
  if (!sequenceComplete(application.sequence)) throw httpError(409, 'Conditions and Shariah steps are still open');
  const customer = await Customer.findById(application.customerId);
  const loan = await createLoan(application, customer, req.user);
  res.json({ application: presentApplication(application), loan });
});
