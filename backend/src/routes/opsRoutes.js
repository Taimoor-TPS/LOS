import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import { requireAuth, requirePermission, applyDataScope } from '../security/auth.js';
import { asyncHandler, httpError } from '../security/http.js';
import { parse } from '../middleware/validate.js';
import { writeAudit } from '../security/audit.js';
import { Application } from '../modules/applications/model/Application.js';
import { Customer } from '../modules/customers/model/Customer.js';
import { LoanAccount } from '../modules/servicing/model/LoanAccount.js';
import {
  DocumentFile, Deviation, Collateral, StageHistory, ApplicationMessage, Complaint,
  GLAccount, AccountingTemplate, Journal, CollectionCase, CollectionAction, PTP, Settlement,
  ClassificationRegime, ReportDefinition, IntegrationConfig, Entity, EodRun,
} from '../models/platformModels.js';
import { LoanTransaction } from '../models/platformModels.js';
import { assertVersion, bump, listArgs, pageResult } from '../services/common.js';
import { transitionApplication, underwrite, disburseApplication, openDeviations } from '../services/origination.js';
import { postRepayment } from '../services/repayment.js';
import { runEod, runEodTo, reconcile } from '../services/eod.js';
import { trialBalanceView, postEvent } from '../services/accounting.js';
import { notify } from '../services/notify.js';
import { checkSoD } from '../security/rbac.js';
import { decryptField, maskCnic } from '../security/crypto.js';
import { testAdapter } from '../integrations/adapters.js';
import { presentCustomer } from '../modules/customers/controller/customerController.js';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', requirePermission('dashboard:view'), asyncHandler(async (req, res) => {
  const stages = await Application.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: '$stage', count: { $sum: 1 } } },
  ]);
  const loans = await LoanAccount.find({ status: 'ACTIVE' }).lean();
  const outstanding = loans.reduce((sum, loan) => sum + Number(loan.principalOutstanding || 0), 0);
  const npl = loans.filter((loan) => ['Substandard', 'Doubtful', 'Loss'].includes(loan.regulatoryClassification));
  const nplAmount = npl.reduce((sum, loan) => sum + Number(loan.principalOutstanding || 0), 0);
  const provision = loans.reduce((sum, loan) => sum + Number(loan.bookedProvision || 0), 0);
  const entity = await Entity.findOne({ code: 'PK-01' }).lean();
  const month = (entity?.businessDate || '').slice(0, 7);
  const disbursed = await LoanAccount.countDocuments({ disbursedAt: { $gte: new Date(`${month || '2000-01'}-01`) } });
  const decided = await Application.countDocuments({ decidedAt: { $ne: null } });
  const approved = await Application.countDocuments({ status: { $in: ['APPROVED', 'ACCEPTED', 'DISBURSED'] } });
  res.json({
    businessDate: entity?.businessDate,
    stages: stages.map((row) => ({ stage: row._id || 'S0', count: row.count })),
    kpis: {
      outstanding,
      nplRatio: outstanding ? nplAmount / outstanding : 0,
      coverage: nplAmount ? provision / nplAmount : 0,
      delinquent: loans.filter((loan) => loan.dpd > 0).length,
      disbursedMtd: disbursed,
      approvalRate: decided ? approved / decided : 0,
    },
  });
}));

router.get('/dashboard/search', requirePermission('dashboard:view'), asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.json({ matches: [] });
  const loans = await LoanAccount.find({ $or: [{ loanAccountNo: new RegExp(q, 'i') }] }).limit(8).lean();
  const applications = await Application.find({ reference: new RegExp(q, 'i') }).limit(8).lean();
  const customers = await Customer.find({ $or: [{ fullName: new RegExp(q, 'i') }, { mobile: q }, { cnicLast4: q.slice(-4) }] }).limit(8).lean();
  res.json({
    matches: [
      ...loans.map((loan) => ({ type: 'loan', id: loan._id, label: loan.loanAccountNo })),
      ...applications.map((row) => ({ type: 'application', id: row._id, label: row.reference })),
      ...customers.map((row) => ({ type: 'customer', id: row._id, label: row.fullName })),
    ],
  });
}));

router.get('/queue', requirePermission('application:view'), asyncHandler(async (req, res) => {
  const filter = { deletedAt: null, stage: { $in: ['S1', 'S2', 'S3', 'S4', 'S6', 'S7'] } };
  if (req.query.stage) filter.stage = String(req.query.stage);
  if (req.query.product) filter.productCode = String(req.query.product);
  if (req.query.branch) filter.branchId = String(req.query.branch);
  applyDataScope(filter, req.user, 'application');
  const items = await Application.find(filter).sort({ slaDueAt: 1, createdAt: 1 }).limit(100).lean();
  res.json({ items });
}));

router.get('/applications', requirePermission('application:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['reference', 'productCode', 'status', 'stage'] });
  applyDataScope(filter, req.user, 'application');
  const [items, total] = await Promise.all([
    Application.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    Application.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/applications/:id', requirePermission('application:view'), asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).lean();
  if (!application) throw httpError(404, 'Application not found');
  const [customer, documents, deviations, collateral, history, messages] = await Promise.all([
    Customer.findById(application.customerId).lean(),
    DocumentFile.find({ applicationId: application._id, deletedAt: null }).lean(),
    Deviation.find({ applicationId: application._id }).lean(),
    Collateral.find({ applicationId: application._id, deletedAt: null }).lean(),
    StageHistory.find({ applicationId: application._id }).sort({ at: 1 }).lean(),
    ApplicationMessage.find({ applicationId: application._id, internal: { $ne: true } }).sort({ createdAt: 1 }).lean(),
  ]);
  const reveal = req.user.permissions.includes('customer:view_full_pii') || req.user.permissions.includes('application:view_full_pii');
  res.json({
    application,
    customer: customer ? presentCustomer(customer, { reveal }) : null,
    documents, deviations, collateral, history, messages,
  });
}));

router.patch('/applications/:id', requirePermission('application:edit'), asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw httpError(404, 'Application not found');
  assertVersion(application, req.body.version);
  const before = application.toObject();
  if (req.body.attributes) {
    application.attributes = { ...application.attributes, ...req.body.attributes };
    application.markModified('attributes');
  }
  if (req.body.assessedIncome != null) {
    application.assessedIncome = req.body.assessedIncome;
    application.assessedIncomeReason = req.body.assessedIncomeReason || '';
  }
  if (req.body.checklist) application.checklist = req.body.checklist;
  bump(application);
  await application.save();
  await writeAudit(req, { action: 'update', resource: 'application', resourceId: application._id, before, after: application.toObject(), reason: req.body.reason || '' });
  res.json({ application });
}));

router.post('/applications/:id/transitions', requirePermission('application:view'), asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw httpError(404, 'Application not found');
  const body = parse(z.object({
    outcome: z.enum(['SUBMIT', 'APPROVE', 'DECLINE', 'RETURN', 'REFER', 'HOLD', 'CANCEL']),
    reasonCode: z.string().optional(),
    comments: z.string().optional(),
    version: z.number(),
    reason: z.string().optional(),
  }), req.body);
  const updated = await transitionApplication(req, application, body);
  res.json({ application: updated });
}));

router.post('/applications/:id/underwrite', requirePermission('application:recommend'), asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw httpError(404, 'Application not found');
  res.json({ application: await underwrite(req, application) });
}));

router.post('/applications/:id/assign', requirePermission('application:assign'), asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw httpError(404, 'Application not found');
  application.assignedTo = req.body.userId || req.user.id;
  await application.save();
  res.json({ application });
}));

router.get('/applications/:id/documents', requirePermission('document:view'), asyncHandler(async (req, res) => {
  const items = await DocumentFile.find({ applicationId: req.params.id, deletedAt: null }).lean();
  res.json({ items });
}));

router.post('/applications/:id/documents/:docId/verify', requirePermission('document:verify'), asyncHandler(async (req, res) => {
  const doc = await DocumentFile.findOne({ _id: req.params.docId, applicationId: req.params.id });
  if (!doc) throw httpError(404, 'Document not found');
  const body = parse(z.object({ decision: z.enum(['VERIFIED', 'REJECTED']), reason: z.string().optional() }), req.body);
  doc.status = body.decision;
  doc.rejectReason = body.reason || '';
  doc.verifiedBy = req.user.id;
  doc.verifiedAt = new Date();
  await doc.save();
  if (body.decision === 'REJECTED') {
    const application = await Application.findById(req.params.id);
    const customer = await Customer.findById(application.customerId);
    await notify('DOC_REJECTED', { id: customer._id, type: 'CUSTOMER', address: customer.mobile }, {
      customer, application, fallback: `Action needed: upload ${doc.label || doc.code} again. ${body.reason || ''}`.trim(), href: `/track/${application._id}`,
    });
    await StageHistory.create({ applicationId: application._id, fromStage: application.stage, toStage: application.stage, outcome: 'QUERY', customerMilestone: 'Action needed', actorName: 'Bank', comments: body.reason || '' });
  }
  await writeAudit(req, { action: 'document_verify', resource: 'document', resourceId: doc._id, after: { status: doc.status }, reason: body.reason || '' });
  res.json({ document: doc });
}));

router.get('/applications/:id/documents/:docId/file', requirePermission('document:download'), asyncHandler(async (req, res) => {
  const doc = await DocumentFile.findById(req.params.docId);
  if (!doc?.storagePath || !fs.existsSync(doc.storagePath)) throw httpError(404, 'File not found');
  res.download(doc.storagePath, doc.fileName || 'document');
}));

router.get('/applications/:id/deviations', requirePermission('application:view'), asyncHandler(async (req, res) => {
  res.json({ items: await Deviation.find({ applicationId: req.params.id }).lean() });
}));

router.post('/applications/:id/deviations/:devId', requirePermission('application:override_rule'), asyncHandler(async (req, res) => {
  const item = await Deviation.findOne({ _id: req.params.devId, applicationId: req.params.id });
  if (!item) throw httpError(404, 'Deviation not found');
  const body = parse(z.object({ decision: z.enum(['APPROVED', 'REJECTED']), justification: z.string().min(3) }), req.body);
  item.status = body.decision;
  item.justification = body.justification;
  item.decidedBy = req.user.id;
  item.decidedAt = new Date();
  await item.save();
  const open = await openDeviations(req.params.id);
  const rank = { NONE: 0, D1: 1, D2: 2, D3: 3 };
  const highest = open.reduce((best, row) => ((rank[row.level] || 0) > (rank[best] || 0) ? row.level : best), 'NONE');
  await Application.updateOne({ _id: req.params.id }, { highestDeviationLevel: highest });
  await writeAudit(req, { action: 'deviation', resource: 'deviation', resourceId: item._id, reason: body.justification, after: { status: item.status } });
  res.json({ item });
}));

router.get('/applications/:id/collaterals', requirePermission('collateral:view'), asyncHandler(async (req, res) => {
  const items = await Collateral.find({ applicationId: req.params.id, deletedAt: null }).lean();
  res.json({ items });
}));
router.post('/applications/:id/collaterals', requirePermission('collateral:create'), asyncHandler(async (req, res) => {
  const item = await Collateral.create({ ...req.body, applicationId: req.params.id, createdBy: req.user.id });
  res.status(201).json({ item });
}));
router.patch('/applications/:id/collaterals/:colId', requirePermission('collateral:edit'), asyncHandler(async (req, res) => {
  const item = await Collateral.findOne({ _id: req.params.colId, applicationId: req.params.id });
  if (!item) throw httpError(404, 'Collateral not found');
  assertVersion(item, req.body.version);
  Object.assign(item, req.body);
  bump(item);
  await item.save();
  res.json({ item });
}));
router.delete('/applications/:id/collaterals/:colId', requirePermission('collateral:edit'), asyncHandler(async (req, res) => {
  const item = await Collateral.findOne({ _id: req.params.colId, applicationId: req.params.id });
  if (!item) throw httpError(404, 'Collateral not found');
  item.status = 'RETIRED';
  item.deletedAt = new Date();
  item.deletedBy = req.user.id;
  await item.save();
  res.json({ item });
}));

router.post('/applications/:id/disburse', requirePermission('disbursement:authorise'), asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw httpError(404, 'Application not found');
  const sod = await checkSoD(req.user, 'disbursement:authorise', { makerId: application.createdBy }, { reason: req.body.reason });
  if (sod.selfAuthorised) application.selfAuthorised = true;
  res.json(await disburseApplication(req, application));
}));

router.post('/applications/:id/messages', requirePermission('application:edit'), asyncHandler(async (req, res) => {
  const item = await ApplicationMessage.create({ applicationId: req.params.id, from: 'BANK', body: req.body.body || '', internal: Boolean(req.body.internal) });
  res.status(201).json({ item });
}));

router.get('/customers', requirePermission('customer:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['fullName', 'customerNo', 'mobile', 'email'] });
  const [rows, total] = await Promise.all([
    Customer.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    Customer.countDocuments(filter),
  ]);
  const reveal = req.user.permissions.includes('customer:view_full_pii');
  res.json(pageResult(rows.map((row) => presentCustomer(row, { reveal })), page, pageSize, total));
}));

router.get('/customers/:id', requirePermission('customer:view'), asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) throw httpError(404, 'Customer not found');
  const reveal = req.query.reveal === '1' && req.user.permissions.includes('customer:view_full_pii');
  if (reveal) await writeAudit(req, { action: 'pii_reveal', resource: 'customer', resourceId: customer._id });
  const [applications, loans, complaints] = await Promise.all([
    Application.find({ customerId: customer._id }).lean(),
    LoanAccount.find({ customerId: customer._id }).lean(),
    Complaint.find({ customerId: customer._id }).lean(),
  ]);
  res.json({ customer: presentCustomer(customer, { reveal }), cnic: reveal ? decryptField(customer.cnicEncrypted) : maskCnic(customer.cnicLast4), applications, loans, complaints });
}));

router.patch('/customers/:id', requirePermission('customer:edit'), asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw httpError(404, 'Customer not found');
  assertVersion(customer, req.body.version);
  const before = customer.toObject();
  ['fullName', 'email', 'city', 'address', 'employer', 'monthlyIncome', 'negativeList'].forEach((key) => {
    if (req.body[key] !== undefined) customer[key] = req.body[key];
  });
  bump(customer);
  await customer.save();
  await writeAudit(req, { action: 'update', resource: 'customer', resourceId: customer._id, before, after: customer.toObject(), reason: req.body.reason || '' });
  res.json({ customer });
}));

router.delete('/customers/:id', requirePermission('customer:edit'), asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw httpError(404, 'Customer not found');
  customer.status = 'DISABLED';
  customer.deletedAt = new Date();
  customer.deletedBy = req.user.id;
  await customer.save();
  await writeAudit(req, { action: 'delete', resource: 'customer', resourceId: customer._id, reason: req.body.reason || '' });
  res.json({ customer });
}));

router.get('/loans', requirePermission('loan:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['loanAccountNo', 'productCode', 'status'] });
  const [items, total] = await Promise.all([
    LoanAccount.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    LoanAccount.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/loans/:id', requirePermission('loan:view'), asyncHandler(async (req, res) => {
  const query = [{ loanAccountNo: req.params.id }];
  if (/^[a-f0-9]{24}$/i.test(req.params.id)) query.unshift({ _id: req.params.id });
  const loan = await LoanAccount.findOne({ $or: query }).lean();
  if (!loan) throw httpError(404, 'Loan not found');
  const transactions = await LoanTransaction.find({ loanId: loan._id }).sort({ createdAt: -1 }).lean();
  const journals = await Journal.find({ _id: { $in: transactions.map((row) => row.journalId).filter(Boolean) } }).lean();
  res.json({ loan, transactions, journals });
}));

router.post('/loans/:id/payments', requirePermission('repayment:post'), asyncHandler(async (req, res) => {
  const body = parse(z.object({ amount: z.number().positive(), idempotencyKey: z.string(), method: z.string().optional() }), req.body);
  res.json(await postRepayment({ loanId: req.params.id, amount: body.amount, idempotencyKey: body.idempotencyKey, channel: 'BRANCH', method: body.method, actor: req.user, req }));
}));

router.post('/loans/:id/transactions/:txnId/reverse', requirePermission('repayment:reverse'), asyncHandler(async (req, res) => {
  const txn = await LoanTransaction.findOne({ _id: req.params.txnId, loanId: req.params.id });
  if (!txn || txn.status === 'REVERSED') throw httpError(404, 'Transaction not found');
  const loan = await LoanAccount.findById(txn.loanId);
  const parts = txn.components || {};
  loan.principalOutstanding = Number(loan.principalOutstanding || 0) + Number(parts.principal || 0);
  loan.interestDue = Number(loan.interestDue || 0) + Number(parts.interest || 0);
  loan.feesDue = Number(loan.feesDue || 0) + Number(parts.fees || 0);
  await loan.save();
  txn.status = 'REVERSED';
  await txn.save();
  if (txn.journalId) {
    const journal = await Journal.findById(txn.journalId).lean();
    if (journal) {
      await Journal.create({
        ...journal,
        _id: undefined,
        reference: `${journal.reference}-R`,
        reversalOf: journal._id,
        lines: (journal.lines || []).map((line) => ({ ...line, dr: line.cr, cr: line.dr })),
        narration: `Reversal ${journal.reference}`,
      });
    }
  }
  await writeAudit(req, { action: 'reverse', resource: 'loan_transaction', resourceId: txn._id, reason: req.body.reason || '' });
  res.json({ transaction: txn });
}));

function glCrud(path, model, perm) {
  router.get(path, requirePermission(`${perm}:view`), asyncHandler(async (req, res) => {
    const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['code', 'name', 'eventCode'] });
    const [items, total] = await Promise.all([model.find(filter).sort(sort).skip(skip).limit(pageSize).lean(), model.countDocuments(filter)]);
    res.json(pageResult(items, page, pageSize, total));
  }));
  router.post(path, requirePermission(perm === 'gl' ? 'gl:manual_journal' : 'provision:run'), asyncHandler(async (req, res) => {
    const item = await model.create({ ...req.body, createdBy: req.user.id });
    await writeAudit(req, { action: 'create', resource: path, resourceId: item._id, after: item.toObject() });
    res.status(201).json({ item });
  }));
  router.patch(`${path}/:id`, requirePermission(perm === 'gl' ? 'gl:manual_journal' : 'provision:run'), asyncHandler(async (req, res) => {
    const item = await model.findById(req.params.id);
    if (!item) throw httpError(404, 'Not found');
    assertVersion(item, req.body.version);
    Object.assign(item, req.body);
    bump(item);
    await item.save();
    res.json({ item });
  }));
  router.delete(`${path}/:id`, requirePermission(perm === 'gl' ? 'gl:manual_journal' : 'provision:run'), asyncHandler(async (req, res) => {
    const item = await model.findById(req.params.id);
    if (!item) throw httpError(404, 'Not found');
    item.status = 'RETIRED';
    item.deletedAt = new Date();
    item.deletedBy = req.user.id;
    await item.save();
    res.json({ item });
  }));
}

glCrud('/gl/accounts', GLAccount, 'gl');
glCrud('/gl/templates', AccountingTemplate, 'gl');
glCrud('/provisioning/regimes', ClassificationRegime, 'provision');

router.get('/gl/journals', requirePermission('gl:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['reference', 'eventCode', 'narration'] });
  delete filter.deletedAt;
  const [items, total] = await Promise.all([
    Journal.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    Journal.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/gl/journals/:id', requirePermission('gl:view'), asyncHandler(async (req, res) => {
  const item = await Journal.findById(req.params.id).lean();
  if (!item) throw httpError(404, 'Journal not found');
  res.json({ item });
}));

router.post('/gl/journals', requirePermission('gl:manual_journal'), asyncHandler(async (req, res) => {
  const body = parse(z.object({
    narration: z.string().min(3),
    lines: z.array(z.object({ gl: z.string(), dr: z.number().optional(), cr: z.number().optional() })).min(2),
    reason: z.string().optional(),
  }), req.body);
  const debit = body.lines.reduce((sum, line) => sum + Number(line.dr || 0), 0);
  const credit = body.lines.reduce((sum, line) => sum + Number(line.cr || 0), 0);
  if (debit !== credit) throw httpError(400, 'Journal is not balanced', { code: 'UNBALANCED' });
  const entity = await Entity.findOne({ code: 'PK-01' }).lean();
  const item = await Journal.create({
    reference: `MJ${Date.now()}`,
    eventCode: 'MANUAL',
    status: 'PENDING',
    narration: body.narration,
    lines: body.lines,
    makerId: req.user.id,
    businessDate: entity?.businessDate,
    valueDate: entity?.businessDate,
    reason: body.reason || '',
  });
  await writeAudit(req, { action: 'create', resource: 'journal', resourceId: item._id, after: item.toObject() });
  res.status(201).json({ item });
}));

router.post('/gl/journals/:id/approve', requirePermission('gl:approve_journal'), asyncHandler(async (req, res) => {
  const item = await Journal.findById(req.params.id);
  if (!item || item.status !== 'PENDING') throw httpError(409, 'Journal is not waiting');
  const sod = await checkSoD(req.user, 'gl:approve_journal', { makerId: item.makerId }, { reason: req.body.reason });
  item.status = 'POSTED';
  item.checkerId = req.user.id;
  item.selfAuthorised = Boolean(sod.selfAuthorised);
  await item.save();
  res.json({ item });
}));

router.post('/gl/journals/:id/reverse', requirePermission('gl:manual_journal'), asyncHandler(async (req, res) => {
  const item = await Journal.findById(req.params.id).lean();
  if (!item) throw httpError(404, 'Journal not found');
  const reversal = await Journal.create({
    reference: `${item.reference}-R`,
    eventCode: item.eventCode,
    status: 'POSTED',
    reversalOf: item._id,
    lines: (item.lines || []).map((line) => ({ ...line, dr: line.cr, cr: line.dr })),
    narration: `Reversal of ${item.reference}`,
    makerId: req.user.id,
    businessDate: item.businessDate,
    valueDate: item.valueDate,
    reason: req.body.reason || '',
  });
  res.json({ item: reversal });
}));

router.get('/gl/trial-balance', requirePermission('gl:view'), asyncHandler(async (req, res) => {
  res.json(await trialBalanceView());
}));

router.get('/gl/reconciliation', requirePermission('gl:view'), asyncHandler(async (req, res) => {
  const entity = await Entity.findOne({ code: 'PK-01' }).lean();
  res.json(await reconcile(entity.businessDate));
}));

router.post('/eod/run', requirePermission('gl:eod_run'), asyncHandler(async (req, res) => {
  res.json(await runEod({ actorId: req.user.id }));
}));

router.post('/eod/run-to', requirePermission('gl:eod_run'), asyncHandler(async (req, res) => {
  const body = parse(z.object({ target: z.string() }), req.body);
  res.json(await runEodTo(body.target, { actorId: req.user.id }));
}));

router.get('/eod', requirePermission('gl:view'), asyncHandler(async (req, res) => {
  const entity = await Entity.findOne({ code: 'PK-01' }).lean();
  const runs = await EodRun.find().sort({ createdAt: -1 }).limit(20).lean();
  res.json({ businessDate: entity?.businessDate, runs });
}));

router.get('/collections/cases', requirePermission('collection:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['strategy', 'queue', 'bucket'] });
  delete filter.deletedAt;
  const [items, total] = await Promise.all([
    CollectionCase.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    CollectionCase.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/collections/cases/:id', requirePermission('collection:view'), asyncHandler(async (req, res) => {
  const item = await CollectionCase.findById(req.params.id).lean();
  if (!item) throw httpError(404, 'Case not found');
  const [actions, ptps, settlements] = await Promise.all([
    CollectionAction.find({ caseId: item._id }).sort({ at: -1 }).lean(),
    PTP.find({ caseId: item._id }).lean(),
    Settlement.find({ caseId: item._id }).lean(),
  ]);
  res.json({ item, actions, ptps, settlements });
}));

router.patch('/collections/cases/:id', requirePermission('collection:assign'), asyncHandler(async (req, res) => {
  const item = await CollectionCase.findById(req.params.id);
  if (!item) throw httpError(404, 'Case not found');
  if (req.body.assigneeId) item.assigneeId = req.body.assigneeId;
  if (req.body.flags) item.flags = req.body.flags;
  bump(item);
  await item.save();
  res.json({ item });
}));

router.post('/collections/cases/:id/actions', requirePermission('collection:act'), asyncHandler(async (req, res) => {
  const hour = new Date().getHours();
  if (hour < 9 || hour >= 19) throw httpError(409, 'Collections contact is allowed between 09:00 and 19:00', { code: 'CONTACT_WINDOW' });
  const body = parse(z.object({
    channel: z.string(), contactPerson: z.string(), resultCode: z.string(), delayReason: z.string().optional(), notes: z.string().optional(),
  }), req.body);
  const item = await CollectionAction.create({ ...body, caseId: req.params.id, actorId: req.user.id });
  await writeAudit(req, { action: 'collection_action', resource: 'collection_case', resourceId: req.params.id, after: item.toObject() });
  res.status(201).json({ item });
}));

router.post('/collections/cases/:id/ptps', requirePermission('collection:act'), asyncHandler(async (req, res) => {
  const item = await PTP.create({ caseId: req.params.id, amount: req.body.amount, promiseDate: req.body.promiseDate, notes: req.body.notes || '' });
  res.status(201).json({ item });
}));

router.post('/collections/cases/:id/settlements', requirePermission('collection:settle_propose'), asyncHandler(async (req, res) => {
  const item = await Settlement.create({ caseId: req.params.id, loanId: req.body.loanId, amount: req.body.amount, reason: req.body.reason || '', makerId: req.user.id, status: 'PROPOSED' });
  res.status(201).json({ item });
}));

router.post('/collections/cases/:id/settlements/:sid/approve', requirePermission('collection:settle_approve'), asyncHandler(async (req, res) => {
  const item = await Settlement.findOne({ _id: req.params.sid, caseId: req.params.id });
  if (!item) throw httpError(404, 'Settlement not found');
  const sod = await checkSoD(req.user, 'collection:settle_approve', { makerId: item.makerId }, { reason: req.body.reason });
  item.status = 'APPROVED';
  item.checkerId = req.user.id;
  item.selfAuthorised = Boolean(sod.selfAuthorised);
  await item.save();
  res.json({ item });
}));

router.get('/reports', requirePermission('report:view'), asyncHandler(async (req, res) => {
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['code', 'name', 'purpose'] });
  const [items, total] = await Promise.all([
    ReportDefinition.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
    ReportDefinition.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.post('/reports', requirePermission('report:schedule'), asyncHandler(async (req, res) => {
  const item = await ReportDefinition.create(req.body);
  res.status(201).json({ item });
}));

router.patch('/reports/:id', requirePermission('report:schedule'), asyncHandler(async (req, res) => {
  const item = await ReportDefinition.findById(req.params.id);
  if (!item) throw httpError(404, 'Report not found');
  assertVersion(item, req.body.version);
  Object.assign(item, req.body);
  bump(item);
  await item.save();
  res.json({ item });
}));

router.delete('/reports/:id', requirePermission('report:schedule'), asyncHandler(async (req, res) => {
  const item = await ReportDefinition.findById(req.params.id);
  if (!item) throw httpError(404, 'Report not found');
  item.status = 'RETIRED';
  item.deletedAt = new Date();
  await item.save();
  res.json({ item });
}));

const SOURCES = {
  applications: Application,
  customers: Customer,
  loans: LoanAccount,
  transactions: LoanTransaction,
  collection_cases: CollectionCase,
  journals: Journal,
};

router.post('/reports/:id/run', requirePermission('report:view'), asyncHandler(async (req, res) => {
  const report = await ReportDefinition.findById(req.params.id).lean();
  if (!report) throw httpError(404, 'Report not found');
  const model = SOURCES[report.dataSource];
  if (!model) throw httpError(400, 'This data source is not available');
  const { page, pageSize, skip } = listArgs(req.query);
  const filter = { ...(req.body?.filter || {}) };
  if (report.dataSource !== 'journals' && report.dataSource !== 'transactions' && report.dataSource !== 'collection_cases') filter.deletedAt = null;
  const [rows, total] = await Promise.all([
    model.find(filter).skip(skip).limit(pageSize).lean(),
    model.countDocuments(filter),
  ]);
  const reveal = req.user.permissions.includes('customer:view_full_pii');
  const items = rows.map((row) => {
    const copy = { ...row };
    if (!reveal) {
      delete copy.cnicEncrypted;
      delete copy.phoneEncrypted;
      if (copy.cnicLast4) copy.cnic = maskCnic(copy.cnicLast4);
    }
    return copy;
  });
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/complaints', requirePermission('customer:view'), asyncHandler(async (req, res) => {
  const items = await Complaint.find().sort({ createdAt: -1 }).lean();
  res.json({ items, page: 1, pageSize: items.length, total: items.length });
}));

router.post('/complaints/:id/resolve', requirePermission('customer:edit'), asyncHandler(async (req, res) => {
  const item = await Complaint.findById(req.params.id);
  if (!item) throw httpError(404, 'Complaint not found');
  item.status = 'RESOLVED';
  item.resolution = req.body.resolution || '';
  await item.save();
  res.json({ item });
}));

router.get('/integrations/config', requirePermission('integration:view_logs'), asyncHandler(async (req, res) => {
  const items = await IntegrationConfig.find({ deletedAt: null }).lean();
  res.json({ items, page: 1, pageSize: items.length, total: items.length });
}));

router.post('/integrations/config', requirePermission('integration:configure'), asyncHandler(async (req, res) => {
  const item = await IntegrationConfig.create(req.body);
  res.status(201).json({ item });
}));

router.patch('/integrations/config/:id', requirePermission('integration:configure'), asyncHandler(async (req, res) => {
  const item = await IntegrationConfig.findById(req.params.id);
  if (!item) throw httpError(404, 'Adapter not found');
  assertVersion(item, req.body.version);
  Object.assign(item, req.body);
  bump(item);
  await item.save();
  res.json({ item });
}));

router.delete('/integrations/config/:id', requirePermission('integration:configure'), asyncHandler(async (req, res) => {
  const item = await IntegrationConfig.findById(req.params.id);
  if (!item) throw httpError(404, 'Adapter not found');
  item.status = 'RETIRED';
  item.deletedAt = new Date();
  await item.save();
  res.json({ item });
}));

router.post('/integrations/config/:id/test', requirePermission('integration:test'), asyncHandler(async (req, res) => {
  const item = await IntegrationConfig.findById(req.params.id).lean();
  if (!item) throw httpError(404, 'Adapter not found');
  res.json({ result: await testAdapter(item.code, req.body || {}) });
}));

router.get('/integrations/logs', requirePermission('integration:view_logs'), asyncHandler(async (req, res) => {
  const { IntegrationLog } = await import('../models/platformModels.js');
  const { page, pageSize, filter, sort, skip } = listArgs(req.query, { searchFields: ['code', 'status'] });
  delete filter.deletedAt;
  const [items, total] = await Promise.all([
    IntegrationLog.find(filter).sort(sort.code ? sort : { createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    IntegrationLog.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

router.get('/audit', requirePermission('audit:view'), asyncHandler(async (req, res) => {
  const { AuditLog } = await import('../modules/compliance/model/AuditLog.js');
  const filter = {};
  if (req.query.resource) filter.resource = String(req.query.resource);
  if (req.query.resourceId) filter.resourceId = String(req.query.resourceId);
  const { page, pageSize, skip } = listArgs(req.query);
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json(pageResult(items, page, pageSize, total));
}));

export default router;
