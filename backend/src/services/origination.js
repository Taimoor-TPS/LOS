import crypto from 'crypto';
import mongoose from 'mongoose';
import { Application, Counter } from '../modules/applications/model/Application.js';
import { Customer } from '../modules/customers/model/Customer.js';
import { Product } from '../modules/products/model/Product.js';
import { Workflow, WorkflowVersion, Deviation, StageHistory, DocumentFile } from '../models/platformModels.js';
import { Rule } from '../modules/rules/model/Rule.js';
import { Scorecard } from '../modules/scorecards/model/Scorecard.js';
import { matchRule } from '../engine/rulesEngine.js';
import { scoreApplication } from '../engine/scoreboard.js';
import { assessAffordability } from '../engine/affordability.js';
import { priceFacility } from '../engine/pricingEngine.js';
import { buildSchedule, decisionOutcome, pmt, annualPercentageRate } from '../engine/platformEngine.js';
import { checkDoA, checkSoD } from '../security/rbac.js';
import { httpError } from '../security/http.js';
import { assertVersion, bump, nextSeq } from './common.js';
import { notify } from './notify.js';
import { pullBureau, screenAml, sendPayment } from '../integrations/adapters.js';
import { writeAudit } from '../security/audit.js';
import { decryptField } from '../security/crypto.js';
import { Entity } from '../models/platformModels.js';
import { postEvent } from './accounting.js';
import { LoanAccount } from '../modules/servicing/model/LoanAccount.js';
import { LoanTransaction } from '../models/platformModels.js';

const OUTCOME_PERMISSION = {
  SUBMIT: 'application:submit',
  APPROVE: 'application:approve',
  DECLINE: 'application:decline',
  RETURN: 'application:return',
  REFER: 'application:recommend',
  HOLD: 'application:edit',
  CANCEL: 'application:cancel',
};

export async function publishedWorkflow(code = 'WF-RETAIL') {
  const workflow = await Workflow.findOne({ code, status: 'ACTIVE', deletedAt: null }).lean();
  if (!workflow) throw httpError(500, 'No published workflow is configured');
  if (workflow.publishedVersion) {
    const version = await WorkflowVersion.findOne({ code, version: workflow.publishedVersion }).lean();
    if (version) return { ...workflow, stages: version.stages, transitions: version.transitions };
  }
  return workflow;
}

function stageOf(workflow, code) {
  return (workflow.stages || []).find((stage) => stage.code === code);
}

export async function openDeviations(applicationId) {
  return Deviation.find({ applicationId, status: 'OPEN' }).lean();
}

export async function transitionApplication(req, application, { outcome, reasonCode, comments, version, reason }) {
  assertVersion(application, version);
  const before = application.toObject();
  const workflow = await publishedWorkflow(application.workflowCode || 'WF-RETAIL');
  const stage = stageOf(workflow, application.stage || 'S0');
  if (!stage) throw httpError(409, 'Current stage is not in the workflow');
  if (!(stage.allowedOutcomes || []).includes(outcome)) {
    throw httpError(409, `${outcome} is not allowed from ${stage.code}`, { code: 'OUTCOME_NOT_ALLOWED' });
  }
  const edge = (workflow.transitions || []).find((row) => row.from === stage.code && row.outcome === outcome);
  if (!edge) throw httpError(409, 'No transition is configured for this outcome');
  const permission = OUTCOME_PERMISSION[outcome];
  if (permission && req.user?.principal === 'STAFF' && !req.user.permissions?.includes(permission)) {
    throw httpError(403, 'You do not have access to this action');
  }
  if (outcome === 'APPROVE') {
    const open = await openDeviations(application._id);
    if (open.length) {
      throw httpError(409, 'Resolve open deviations before approval', { code: 'OPEN_DEVIATIONS', details: { items: open } });
    }
    checkDoA(req.user, application);
    const sod = await checkSoD(req.user, 'application:approve', application, { reason });
    application.selfAuthorised = Boolean(sod.selfAuthorised);
    application.selfAuthReason = reason || '';
  }
  const next = stageOf(workflow, edge.to);
  application.stage = edge.to;
  application.status = outcome === 'DECLINE' ? 'DECLINED' : outcome === 'CANCEL' ? 'CANCELLED' : edge.to;
  if (outcome === 'APPROVE') {
    application.status = 'APPROVED';
    const customer = await Customer.findById(application.customerId).lean();
    const product = await Product.findOne({ code: application.productCode }).lean();
    application.offer = await buildOffer(application, product, customer);
    application.decidedAt = new Date();
  }
  if (outcome === 'DECLINE') application.decidedAt = new Date();
  if (next?.slaHours) application.slaDueAt = new Date(Date.now() + next.slaHours * 3600 * 1000);
  bump(application);
  await application.save();
  await StageHistory.create({
    applicationId: application._id,
    fromStage: stage.code,
    toStage: edge.to,
    outcome,
    reasonCode: reasonCode || '',
    comments: comments || '',
    actorId: req.user?.id || '',
    actorName: req.user?.principal === 'STAFF' ? 'Bank' : 'You',
    customerMilestone: next?.customerMilestone || stage.customerMilestone || '',
  });
  await writeAudit(req, { action: `transition_${outcome}`, resource: 'application', resourceId: application._id, before, after: application.toObject(), reason: reason || comments || '' });
  const customer = await Customer.findById(application.customerId).lean();
  if (customer && outcome === 'APPROVE') {
    await notify('APPROVED', { id: customer._id, type: 'CUSTOMER', address: customer.mobile }, {
      customer, application, title: 'Approved — offer ready', fallback: 'Approved — offer ready', href: `/offer/${application._id}`,
    });
  }
  if (customer && outcome === 'DECLINE') {
    await notify('DECLINED', { id: customer._id, type: 'CUSTOMER', address: customer.mobile }, {
      customer, application, fallback: 'We are unable to offer this product at this time.',
    });
  }
  return application;
}

export async function buildOffer(application, product, customer) {
  const amount = Number(application.amount || application.attributes?.requested_amount || 0);
  const tenor = Number(application.tenorMonths || application.attributes?.tenor_months || product?.minTenor || 12);
  const rate = Number(application.indicativeRate || product?.baseRate || 0.2);
  const schedule = buildSchedule({ principal: amount, annualRate: rate, tenorMonths: tenor, firstDue: application.offer?.firstDue });
  const fee = Math.round(amount * Number(product?.feeRate || 0));
  const net = amount - fee;
  const apr = annualPercentageRate({ netDisbursed: net || amount, instalment: schedule.instalment, tenorMonths: tenor });
  const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  return {
    amount, tenorMonths: tenor, rate, apr, instalment: schedule.instalment,
    totalPayable: schedule.instalment * tenor, fee, schedule: schedule.lines, expiresAt: expires.toISOString(),
    customerName: customer?.fullName || '',
  };
}

function featuresOf(application, customer, bureau) {
  return {
    monthlyIncome: Number(application.attributes?.gross_monthly_income || customer.monthlyIncome || 0),
    netMonthlyIncome: Number(application.attributes?.net_monthly_income || customer.monthlyIncome || 0),
    requestedAmount: Number(application.amount || 0),
    tenorMonths: Number(application.tenorMonths || 0),
    channel: application.channel,
    bureauScore: bureau?.score || customer.bureauScore || 0,
    age: customer.age || 30,
  };
}

export async function runPreScreen(applicationId) {
  const application = await Application.findById(applicationId);
  if (!application) return;
  const customer = await Customer.findById(application.customerId);
  const cnic = decryptField(customer.cnicEncrypted);
  const aml = await screenAml(cnic);
  const bureau = await pullBureau(cnic, { hard: false });
  const rules = await Rule.find({ status: 'active', enabled: true, deletedAt: null, ruleType: { $in: ['ELIGIBILITY', 'eligibility'] } }).lean();
  const features = featuresOf(application, customer, bureau);
  const hits = rules.filter((rule) => {
    const products = rule.appliesTo?.products || ['*'];
    if (!products.includes('*') && !products.includes(application.productCode)) return false;
    return matchRule(rule, features);
  });
  const hard = hits.find((rule) => rule.then?.stop || rule.ruleType === 'ELIGIBILITY');
  application.bureau = { score: bureau.score, worstDpd: bureau.worstDpd || 0, writeOff: Boolean(bureau.writeOff), source: bureau.source, pulledAt: new Date() };
  application.screening = { sanctions: aml.sanctionsPotential, pep: aml.pep, provider: aml.provider };
  application.preScreen = { at: new Date(), bureau, aml };
  if (bureau.writeOff || customer.negativeList) {
    application.stage = 'S1';
    application.status = 'DECLINED';
    application.decidedAt = new Date();
    application.decision = { outcome: 'DECLINED', reasonCode: 'WRITE_OFF', customerMessage: 'We are unable to offer this product at this time.' };
    await StageHistory.create({ applicationId: application._id, fromStage: 'S1', toStage: 'S1', outcome: 'DECLINE', reasonCode: 'WRITE_OFF', customerMilestone: 'Not approved', actorName: 'Bank' });
    await notify('DECLINED', { id: customer._id, type: 'CUSTOMER', address: customer.mobile }, { customer, application, fallback: 'We are unable to offer this product at this time.' });
  } else if (aml.sanctionsPotential) {
    application.stage = 'S2';
    application.status = 'COMPLIANCE_HOLD';
    application.riskFlags = [...new Set([...(application.riskFlags || []), 'SANCTIONS'])];
    await StageHistory.create({ applicationId: application._id, fromStage: 'S1', toStage: 'S2', outcome: 'REFER', reasonCode: 'SANCTIONS', customerMilestone: 'Under review', actorName: 'Bank' });
  } else if (hard && (hard.then?.outcome === 'decline')) {
    application.stage = 'S1';
    application.status = 'DECLINED';
    application.decision = { outcome: 'DECLINED', reasonCode: hard.then.reasonCode, customerMessage: 'We are unable to offer this product at this time.' };
    await StageHistory.create({ applicationId: application._id, fromStage: 'S1', toStage: 'S1', outcome: 'DECLINE', reasonCode: hard.then.reasonCode, customerMilestone: 'Not approved', actorName: 'Bank' });
  } else {
    application.stage = 'S2';
    application.status = 'IN_QUEUE';
    const workflow = await publishedWorkflow(application.workflowCode || 'WF-RETAIL');
    const stage = stageOf(workflow, 'S2');
    if (stage?.slaHours) application.slaDueAt = new Date(Date.now() + stage.slaHours * 3600 * 1000);
    await StageHistory.create({ applicationId: application._id, fromStage: 'S1', toStage: 'S2', outcome: 'PASS', customerMilestone: 'Under review', actorName: 'Bank' });
    await notify('UNDER_REVIEW', { id: customer._id, type: 'CUSTOMER', address: customer.mobile }, { customer, application, fallback: 'Your application is under review.' });
  }
  await application.save();
  return application;
}

export async function underwrite(req, application) {
  const customer = await Customer.findById(application.customerId);
  const product = await Product.findOne({ code: application.productCode }).lean();
  const cnic = decryptField(customer.cnicEncrypted);
  const bureau = await pullBureau(cnic, { hard: true });
  const income = Number(application.assessedIncome || application.attributes?.net_monthly_income || customer.monthlyIncome || 0);
  const obligations = Number(application.attributes?.monthly_obligations || customer.monthlyObligations || 0);
  const amount = Number(application.amount || 0);
  const tenor = Number(application.tenorMonths || 12);
  const card = await Scorecard.findOne({ code: product?.scorecardCode, status: 'active' }).lean()
    || await Scorecard.findOne({ status: 'active' }).lean();
  const scored = scoreApplication(card, {
    bureauScore: bureau.score || 0,
    capacityScore: 70,
    salaryMonths: customer.salaryMonths || 12,
    relationshipYears: customer.relationshipYears || 1,
    cashflowStability: customer.cashflowStability || 60,
  });
  const priced = priceFacility({ product: { ...product, baseRate: product?.baseRate || 0.2 }, score: scored.score, features: { relationshipYears: customer.relationshipYears || 0 }, pricing: {} });
  const instalment = pmt(priced.rate, tenor, amount);
  const affordability = assessAffordability({ income, obligations, instalment, regulatory: { maxDbr: product?.dbrCap || 0.4 }, mode: 'dbr' });
  const band = scored.score >= 72 ? 'A' : scored.score >= 60 ? 'C' : 'E';
  const matrix = decisionOutcome({
    knockOut: Boolean(bureau.writeOff),
    bureau: bureau.unavailable ? 'timeout' : 'clear',
    dbrWithinCap: Boolean(affordability.pass),
    band,
    deviations: false,
    bureauUnavailable: Boolean(bureau.unavailable),
  });
  application.bureau = { score: bureau.score, worstDpd: bureau.worstDpd || 0, writeOff: Boolean(bureau.writeOff), source: 'mock-bureau', pulledAt: new Date(), summary: bureau };
  application.indicativeRate = priced.rate;
  application.indicativeInstalment = instalment;
  application.decision = { ...matrix, score: scored, pricing: priced, affordability, income, obligations, instalment };
  const policyRules = await Rule.find({ status: 'active', enabled: true, deletedAt: null, ruleType: 'POLICY' }).lean();
  const features = { ...featuresOf(application, customer, bureau), requestedAmount: amount };
  let highest = 'NONE';
  const rank = { NONE: 0, D1: 1, D2: 2, D3: 3 };
  for (const rule of policyRules) {
    const products = rule.appliesTo?.products || ['*'];
    if (!products.includes('*') && !products.includes(application.productCode)) continue;
    if (!matchRule(rule, features)) continue;
    const level = rule.deviationLevel || rule.then?.level || 'D1';
    if ((rank[level] || 0) > (rank[highest] || 0)) highest = level;
    const exists = await Deviation.findOne({ applicationId: application._id, ruleCode: rule.code, status: 'OPEN' });
    if (!exists) {
      await Deviation.create({
        applicationId: application._id,
        code: `DEV-${rule.code}`,
        ruleCode: rule.code,
        level,
        reason: rule.then?.reasonCode || rule.name,
        status: 'OPEN',
      });
    }
  }
  application.highestDeviationLevel = highest;
  await application.save();
  await writeAudit(req, { action: 'underwrite', resource: 'application', resourceId: application._id, after: application.decision });
  return application;
}

export async function disburseApplication(req, application) {
  if (application.status === 'DISBURSED' && application.loanId) {
    const existing = await LoanAccount.findById(application.loanId).lean();
    return { application, loan: existing, idempotent: true };
  }
  if (!['S6', 'S7', 'ACCEPTED'].includes(application.stage) && application.status !== 'ACCEPTED') {
    throw httpError(409, 'Complete the offer and final checks before disbursement');
  }
  const openDocs = await DocumentFile.countDocuments({ applicationId: application._id, required: true, status: { $nin: ['VERIFIED'] }, deletedAt: null });
  if (openDocs) throw httpError(409, 'Required documents are still unverified');
  const mandate = (application.checklist || []).find((item) => item.code === 'MANDATE');
  if (mandate && mandate.state !== 'COMPLIED' && mandate.state !== 'WAIVED') {
    throw httpError(409, 'Repayment mandate is still open');
  }
  const customer = await Customer.findById(application.customerId);
  const product = await Product.findOne({ code: application.productCode }).lean();
  const entity = await Entity.findOne({ code: 'PK-01' }).lean();
  const businessDate = entity?.businessDate;
  const amount = Number(application.offer?.amount || application.amount);
  const tenor = Number(application.offer?.tenorMonths || application.tenorMonths);
  const rate = Number(application.offer?.rate || application.indicativeRate || product.baseRate);
  const fee = Math.round(amount * Number(product.feeRate || 0));
  const insurance = Number(product.insurance?.premium || 0);
  const net = amount - fee - insurance;
  const schedule = buildSchedule({ principal: amount, annualRate: rate, tenorMonths: tenor, firstDue: businessDate });
  const seq = await nextSeq(Counter, 'loan');
  const branch = (customer.branchId || '0001').replace(/\D/g, '').padStart(4, '0').slice(-4);
  const loanAccountNo = `${(entity?.code || 'PK01').replace('-', '')}${branch}${product.shortCode || 'PFS'}${String(seq).padStart(8, '0')}`;
  const session = await mongoose.startSession();
  let loan;
  let journal;
  try {
    session.startTransaction();
    const created = await LoanAccount.create([{
      tenantId: customer.tenantId,
      loanAccountNo,
      applicationId: application._id,
      customerId: customer._id,
      productCode: product.code,
      productVersion: application.productVersion || product.version || 1,
      contractType: product.contractType,
      currency: product.currency || 'PKR',
      branchId: customer.branchId,
      entityId: 'PK-01',
      sanctionedAmount: amount,
      disbursedAmount: amount,
      principal: amount,
      rate,
      rateType: product.pricing?.rateType || 'FIXED',
      tenorMonths: tenor,
      instalment: schedule.instalment,
      firstDueDate: schedule.lines[0]?.due,
      maturityDate: schedule.lines.at(-1)?.due,
      repaymentMode: 'AUTO_DEBIT',
      mandateId: mandate?.reference || `MAN-${loanAccountNo}`,
      principalOutstanding: amount,
      status: 'ACTIVE',
      islamic: ['murabaha', 'ijarah', 'diminishing_musharakah'].includes(product.contractType),
      schedule: schedule.lines.map((line) => ({
        instalmentNo: line.n,
        dueDate: line.due,
        opening: line.opening,
        instalment: line.instalment,
        principal: line.principal,
        interest: line.profit,
        closing: line.closing,
        status: 'FUTURE',
        paidAmount: 0,
      })),
      disbursedAt: new Date(),
      accountMasked: customer.accountMasked || '****0000',
    }], { session });
    loan = created[0];
    const ctx = {
      principal: amount, fees: fee, insurance, netDisbursed: net, amount,
      productCode: product.code, currency: product.currency || 'PKR', branchId: customer.branchId,
      entityId: 'PK-01', valueDate: businessDate, businessDate, actorId: req.user.id,
    };
    journal = await postEvent('E1', ctx, { session, narration: `Disbursement ${loanAccountNo}` });
    if (fee) await postEvent('E2', ctx, { session, narration: `Fee ${loanAccountNo}` });
    if (insurance) await postEvent('E3', ctx, { session, narration: `Insurance ${loanAccountNo}` });
    await postEvent('E22', ctx, { session, narration: `Payout ${loanAccountNo}` });
    await LoanTransaction.create([{
      loanId: loan._id, type: 'DISBURSEMENT', valueDate: businessDate, businessDate,
      amount, components: { principal: amount, interest: 0, fees: fee, charges: insurance },
      channel: 'BRANCH', idempotencyKey: `DISB-${application._id}`, journalId: journal?._id,
    }], { session });
    await sendPayment({ amount: net, method: 'LINKED_ACCOUNT', reference: loanAccountNo });
    application.status = 'DISBURSED';
    application.stage = 'S8';
    application.disbursedAt = new Date();
    application.loanId = loan._id;
    await application.save({ session });
    await StageHistory.create([{
      applicationId: application._id, fromStage: 'S7', toStage: 'S8', outcome: 'DISBURSE',
      customerMilestone: 'Funds sent', actorName: 'Bank',
    }], { session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
  await notify('DISBURSED', { id: customer._id, type: 'CUSTOMER', address: customer.mobile }, {
    customer, application, loan, fallback: `Funds sent. Loan account ${loan.loanAccountNo}.`, href: '/my-loans',
  });
  await writeAudit(req, { action: 'disburse', resource: 'application', resourceId: application._id, after: { loanAccountNo: loan.loanAccountNo } });
  return { application, loan, journal };
}

export function workflowHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
