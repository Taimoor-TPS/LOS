import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env.js';
import { requireAuth, requireCustomer, setSession, signToken } from '../security/auth.js';
import { asyncHandler, httpError } from '../security/http.js';
import { parse } from '../middleware/validate.js';
import { hashPassword, verifyPassword } from '../security/password.js';
import { encryptField, last4, sha256 } from '../security/crypto.js';
import { Customer } from '../modules/customers/model/Customer.js';
import { Product } from '../modules/products/model/Product.js';
import { Application, Counter } from '../modules/applications/model/Application.js';
import {
  Registration, CustomerCredential, Outbox, Form, FormVersion, DocumentFile, Notification,
  Complaint, EligibilityCheck, StageHistory, MasterList,
} from '../models/platformModels.js';
import { LoanAccount } from '../modules/servicing/model/LoanAccount.js';
import { notify } from '../services/notify.js';
import { buildOffer, runPreScreen } from '../services/origination.js';
import { postRepayment } from '../services/repayment.js';
import { verifyIdentity } from '../integrations/adapters.js';
import { eligibilityResult, pmt, annualPercentageRate, buildSchedule } from '../engine/platformEngine.js';
import { ageFromDob } from '../engine/money.js';
import { nextSeq } from '../services/common.js';
import { writeAudit } from '../security/audit.js';

const router = Router();
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 8, message: { code: 'RATE_LIMITED', message: 'Too many codes requested' } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, message: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts' } });
const eligibilityLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, message: { code: 'RATE_LIMITED', message: 'Too many eligibility checks' } });

const uploadDir = path.resolve('backend/uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 8 * 1024 * 1024 } });

const DEMO_OTP = '123456';
const OTP_TTL_MS = 120 * 1000;
const DEMO_OTP_TTL_MS = 24 * 60 * 60 * 1000;

function otpCode() {
  if (env.demoMode) return DEMO_OTP;
  return String(crypto.randomInt(100000, 1000000));
}

function otpExpiry() {
  return new Date(Date.now() + (env.demoMode ? DEMO_OTP_TTL_MS : OTP_TTL_MS));
}

router.get('/demo/outbox', asyncHandler(async (req, res) => {
  if (!env.demoMode) throw httpError(404, 'Not found');
  const filter = {};
  if (req.query.mobile) filter.to = String(req.query.mobile);
  const items = await Outbox.find(filter).sort({ createdAt: -1 }).limit(30).lean();
  res.json({ items });
}));

router.post('/register/start', otpLimiter, asyncHandler(async (req, res) => {
  const body = parse(z.object({
    mobile: z.string().regex(/^03\d{9}$/),
    cnic: z.string(),
    consent: z.literal(true),
  }), req.body);
  const digits = body.cnic.replace(/\D/g, '');
  if (digits.length !== 13) throw httpError(400, 'Enter a 13 digit identity number');
  const existing = await CustomerCredential.findOne({ mobile: body.mobile });
  if (existing) throw httpError(409, 'This mobile is already registered');
  const code = otpCode();
  const registration = await Registration.create({
    mobile: body.mobile,
    cnicHash: sha256(digits),
    cnicEncrypted: encryptField(digits),
    otpHash: sha256(code),
    otpExpires: otpExpiry(),
    status: 'PENDING',
    consentAt: new Date(),
  });
  await notify('OTP_REGISTER', { address: body.mobile, type: 'CUSTOMER' }, { fallback: `Your verification code is ${code}` });
  res.status(201).json({ registrationId: registration._id, expiresIn: env.demoMode ? DEMO_OTP_TTL_MS / 1000 : OTP_TTL_MS / 1000 });
}));

router.post('/register/resend', otpLimiter, asyncHandler(async (req, res) => {
  const body = parse(z.object({ registrationId: z.string() }), req.body);
  const row = await Registration.findById(body.registrationId);
  if (!row) throw httpError(404, 'Registration not found');
  if (row.lockedUntil && row.lockedUntil > new Date()) throw httpError(423, 'This registration is locked');
  if (row.resends >= 3) throw httpError(429, 'Resend limit reached');
  const code = otpCode();
  row.otpHash = sha256(code);
  row.otpExpires = otpExpiry();
  row.resends += 1;
  row.attempts = 0;
  await row.save();
  await notify('OTP_REGISTER', { address: row.mobile, type: 'CUSTOMER' }, { fallback: `Your verification code is ${code}` });
  res.json({ ok: true });
}));

router.post('/register/verify-otp', asyncHandler(async (req, res) => {
  const body = parse(z.object({ registrationId: z.string(), otp: z.string().length(6) }), req.body);
  const row = await Registration.findById(body.registrationId);
  if (!row) throw httpError(404, 'Registration not found');
  if (row.lockedUntil && row.lockedUntil > new Date()) throw httpError(423, 'Too many attempts. Try again later.');
  const demoBypass = env.demoMode && body.otp === DEMO_OTP;
  if (!demoBypass && (!row.otpExpires || row.otpExpires < new Date())) throw httpError(400, 'The code has expired');
  if (!demoBypass && sha256(body.otp) !== row.otpHash) {
    row.attempts += 1;
    if (row.attempts >= 5) row.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    await row.save();
    throw httpError(400, 'The code does not match');
  }
  row.status = 'VERIFIED';
  await row.save();
  res.json({ ok: true });
}));

router.post('/register/identity', asyncHandler(async (req, res) => {
  const body = parse(z.object({
    registrationId: z.string(),
    email: z.string().email().optional().or(z.literal('')),
    addressConfirmed: z.boolean(),
    residenceType: z.string(),
  }), req.body);
  const row = await Registration.findById(body.registrationId);
  if (!row || row.status !== 'VERIFIED') throw httpError(409, 'Verify the code first');
  const cnic = (await import('../security/crypto.js')).decryptField(row.cnicEncrypted);
  const identity = await verifyIdentity(cnic);
  if (identity.cardStatus === 'EXPIRED') throw httpError(409, 'The identity document is not valid', { code: 'IDENTITY_HARD_STOP' });
  const seq = await nextSeq(Counter, 'customer');
  const customer = await Customer.create({
    tenantId: env.tenantId,
    customerNo: `CIF${String(seq).padStart(8, '0')}`,
    fullName: identity.fullName,
    fatherName: identity.fatherName,
    dateOfBirth: new Date(identity.dateOfBirth),
    age: ageFromDob(identity.dateOfBirth),
    gender: identity.gender,
    address: identity.address,
    residenceType: body.residenceType,
    email: body.email || undefined,
    mobile: row.mobile,
    phoneEncrypted: encryptField(row.mobile),
    phoneLast4: last4(row.mobile),
    cnicEncrypted: row.cnicEncrypted,
    cnicLast4: last4(cnic),
    cnicHash: row.cnicHash,
    kycStatus: identity.flag === 'FACE_MATCH_LOW' ? 'REVIEW' : 'verified',
    status: 'PENDING',
    branchId: '0001',
    entityId: 'PK-01',
    jurisdiction: 'PK',
  });
  row.customerId = customer._id;
  row.status = 'IDENTIFIED';
  await row.save();
  res.json({
    customerId: customer._id,
    identity: { fullName: identity.fullName, fatherName: identity.fatherName, dateOfBirth: identity.dateOfBirth, gender: identity.gender, address: identity.address, locked: true },
    review: identity.flag === 'FACE_MATCH_LOW',
  });
}));

router.post('/register/password', asyncHandler(async (req, res) => {
  const body = parse(z.object({
    registrationId: z.string(),
    password: z.string().min(12).optional(),
    mpin: z.string().regex(/^\d{6}$/).optional(),
    deviceId: z.string().optional(),
  }).refine((value) => value.password || value.mpin, { message: 'Set a password or an MPIN' }), req.body);
  const row = await Registration.findById(body.registrationId);
  if (!row || !row.customerId) throw httpError(409, 'Complete identity verification first');
  const customer = await Customer.findById(row.customerId);
  await CustomerCredential.create({
    customerId: customer._id,
    mobile: row.mobile,
    cnicHash: row.cnicHash,
    passwordHash: body.password ? await hashPassword(body.password) : '',
    mpinHash: body.mpin ? sha256(body.mpin) : '',
    deviceId: body.deviceId || '',
  });
  customer.status = 'ACTIVE';
  await customer.save();
  row.status = 'COMPLETE';
  await row.save();
  setSession(res, signToken(customer, 'CUSTOMER'));
  res.json({ user: { id: customer._id, name: customer.fullName, principal: 'CUSTOMER', customerId: customer._id } });
}));

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const body = parse(z.object({ identifier: z.string(), secret: z.string() }), req.body);
  const digits = body.identifier.replace(/\D/g, '');
  const credential = await CustomerCredential.findOne({
    $or: [{ mobile: body.identifier }, { cnicHash: sha256(digits) }],
    status: 'ACTIVE',
  });
  const invalid = httpError(401, 'Invalid mobile, identity number or secret');
  if (!credential) throw invalid;
  if (credential.lockedUntil && credential.lockedUntil > new Date()) throw httpError(423, 'This account is locked');
  const passwordOk = credential.passwordHash ? await verifyPassword(body.secret, credential.passwordHash) : false;
  const mpinOk = credential.mpinHash ? sha256(body.secret) === credential.mpinHash : false;
  if (!passwordOk && !mpinOk) {
    credential.failedAttempts += 1;
    if (credential.failedAttempts >= 5) credential.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    await credential.save();
    throw invalid;
  }
  credential.failedAttempts = 0;
  credential.lockedUntil = undefined;
  await credential.save();
  const customer = await Customer.findById(credential.customerId);
  setSession(res, signToken(customer, 'CUSTOMER'));
  res.json({ user: { id: customer._id, name: customer.fullName, principal: 'CUSTOMER', customerId: customer._id } });
}));

router.use(requireAuth, requireCustomer);

router.get('/profile', asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user.customerId).lean();
  res.json({ customer });
}));

router.get('/products', asyncHandler(async (req, res) => {
  const items = await Product.find({ status: { $in: ['PUBLISHED', 'active'] }, deletedAt: null }).sort({ 'presentation.displayOrder': 1, name: 1 }).lean();
  res.json({ items });
}));

router.get('/products/:code', asyncHandler(async (req, res) => {
  const product = await Product.findOne({ code: req.params.code, status: { $in: ['PUBLISHED', 'active'] } }).lean();
  if (!product) throw httpError(404, 'Product not found');
  res.json({ product });
}));

router.post('/products/:code/calculate', asyncHandler(async (req, res) => {
  const body = parse(z.object({ amount: z.number().positive(), tenorMonths: z.number().int().positive() }), req.body);
  const product = await Product.findOne({ code: req.params.code }).lean();
  if (!product) throw httpError(404, 'Product not found');
  const minA = product.amount?.min ?? product.minAmount;
  const maxA = product.amount?.max ?? product.maxAmount;
  const minT = product.tenor?.min ?? product.minTenor;
  const maxT = product.tenor?.max ?? product.maxTenor;
  if (body.amount < minA || body.amount > maxA || body.tenorMonths < minT || body.tenorMonths > maxT) {
    throw httpError(400, 'Amount or tenor is outside the product limits');
  }
  const rate = product.baseRate;
  const instalment = pmt(rate, body.tenorMonths, body.amount);
  const fee = Math.round(body.amount * Number(product.feeRate || 0));
  const apr = annualPercentageRate({ netDisbursed: body.amount - fee, instalment, tenorMonths: body.tenorMonths });
  res.json({ instalment, apr, fee, totalPayable: instalment * body.tenorMonths, rate, schedule: buildSchedule({ principal: body.amount, annualRate: rate, tenorMonths: body.tenorMonths }).lines });
}));

router.post('/eligibility', eligibilityLimiter, asyncHandler(async (req, res) => {
  const body = parse(z.object({
    productCode: z.string(),
    employmentType: z.string().optional(),
    netMonthlyIncome: z.number().optional(),
    employer: z.string().optional(),
    existingObligations: z.number().optional(),
    requestedAmount: z.number().optional(),
    tenorMonths: z.number().optional(),
  }), req.body);
  const customer = await Customer.findById(req.user.customerId);
  const product = await Product.findOne({ code: body.productCode }).lean();
  if (!product) throw httpError(404, 'Product not found');
  const income = body.netMonthlyIncome ?? customer.monthlyIncome;
  if (body.employmentType) customer.employmentType = body.employmentType;
  if (body.employer) customer.employer = body.employer;
  if (income != null) customer.monthlyIncome = income;
  if (body.existingObligations != null) customer.monthlyObligations = body.existingObligations;
  await customer.save();
  const missing = [];
  if (!customer.employmentType) missing.push('employmentType');
  if (!customer.monthlyIncome) missing.push('netMonthlyIncome');
  if (missing.length) {
    const result = { outcome: 'NEED_MORE_INFO', missing };
    await EligibilityCheck.create({ customerId: customer._id, productCode: product.code, input: body, result });
    return res.json(result);
  }
  const cnic = (await import('../security/crypto.js')).decryptField(customer.cnicEncrypted);
  const { identityFromId } = await import('../engine/platformEngine.js');
  const id = identityFromId(cnic);
  const result = eligibilityResult({
    writeOffHit: id.flag === 'WRITE_OFF_HIT',
    sanctionsPotential: id.flag === 'SANCTIONS_POTENTIAL',
    cardStatus: id.cardStatus,
    age: customer.age,
    netMonthlyIncome: customer.monthlyIncome,
    existingObligations: customer.monthlyObligations || 0,
    requestedAmount: body.requestedAmount || product.maxAmount,
    tenorMonths: body.tenorMonths || product.maxTenor,
    annualRate: product.baseRate,
  });
  await EligibilityCheck.create({ customerId: customer._id, productCode: product.code, input: body, result });
  res.json(result);
}));

router.get('/forms/:productCode/:stage', asyncHandler(async (req, res) => {
  const form = await Form.findOne({
    status: 'ACTIVE',
    'binding.productCode': { $in: [req.params.productCode, '*'] },
    'binding.stage': req.params.stage,
    'binding.channel': 'MOBILE',
    deletedAt: null,
  }).sort({ 'binding.productCode': -1 }).lean();
  if (!form) throw httpError(404, 'Form not found');
  const version = await FormVersion.findOne({ code: form.code, version: form.publishedVersion }).lean();
  const fields = await FieldCodes(version?.sections || form.sections);
  res.json({ form: version || form, fields });
}));

async function FieldCodes(sections) {
  const codes = [];
  (sections || []).forEach((section) => (section.fields || []).forEach((field) => codes.push(field.fieldCode)));
  const { FieldDefinition } = await import('../models/platformModels.js');
  return FieldDefinition.find({ fieldCode: { $in: codes }, deletedAt: null }).lean();
}

router.post('/applications', asyncHandler(async (req, res) => {
  const body = parse(z.object({ productCode: z.string(), amount: z.number().optional(), tenorMonths: z.number().optional() }), req.body);
  const product = await Product.findOne({ code: body.productCode, status: 'PUBLISHED' }).lean();
  if (!product) throw httpError(404, 'Product is not published');
  const customer = await Customer.findById(req.user.customerId);
  const form = await Form.findOne({ 'binding.productCode': product.code, 'binding.stage': 'S0', 'binding.channel': 'MOBILE', status: 'ACTIVE' }).lean();
  const seq = await nextSeq(Counter, `app-${product.shortCode || 'GEN'}`);
  const day = new Date();
  const yymmdd = `${String(day.getFullYear()).slice(2)}${String(day.getMonth() + 1).padStart(2, '0')}${String(day.getDate()).padStart(2, '0')}`;
  const reference = `PK01${product.shortCode || 'GEN'}${yymmdd}${String(seq).padStart(6, '0')}`;
  const application = await Application.create({
    tenantId: env.tenantId,
    reference,
    customerId: customer._id,
    productCode: product.code,
    productVersion: product.version || 1,
    productFamily: product.family,
    workflowCode: product.workflowCode || 'WF-RETAIL',
    formCode: form?.code,
    formVersion: form?.publishedVersion,
    channel: 'MOBILE',
    branchId: customer.branchId,
    amount: body.amount || product.minAmount,
    tenorMonths: body.tenorMonths || product.minTenor,
    currency: product.currency || 'PKR',
    contractType: product.contractType,
    status: 'DRAFT',
    stage: 'S0',
    createdBy: String(customer._id),
    attributes: {},
  });
  await StageHistory.create({ applicationId: application._id, fromStage: '', toStage: 'S0', outcome: 'CREATE', customerMilestone: 'Draft saved', actorName: 'You' });
  res.status(201).json({ application });
}));

router.patch('/applications/:id', asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, customerId: req.user.customerId });
  if (!application) throw httpError(404, 'Application not found');
  if (application.stage !== 'S0' && application.status !== 'RETURNED') throw httpError(409, 'This application can no longer be edited');
  const attributes = { ...application.attributes, ...(req.body.attributes || {}) };
  application.attributes = attributes;
  if (attributes.requested_amount) application.amount = Number(attributes.requested_amount);
  if (attributes.tenor_months) application.tenorMonths = Number(attributes.tenor_months);
  application.markModified('attributes');
  application.version += 1;
  await application.save();
  res.json({ application });
}));

router.post('/applications/:id/documents', upload.single('file'), asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, customerId: req.user.customerId });
  if (!application) throw httpError(404, 'Application not found');
  if (!req.file) throw httpError(400, 'Choose a file');
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(req.file.mimetype)) throw httpError(400, 'Upload a PDF or an image');
  const data = fs.readFileSync(req.file.path);
  const code = req.body.code || 'DOCUMENT';
  let doc = await DocumentFile.findOne({ applicationId: application._id, code, deletedAt: null });
  if (!doc) doc = new DocumentFile({ applicationId: application._id, customerId: application.customerId, code, label: req.body.label || code });
  doc.fileName = req.file.originalname;
  doc.mime = req.file.mimetype;
  doc.size = req.file.size;
  doc.sha256 = crypto.createHash('sha256').update(data).digest('hex');
  doc.storagePath = req.file.path;
  doc.status = 'UPLOADED';
  doc.rejectReason = '';
  await doc.save();
  res.status(201).json({ document: doc });
}));

router.get('/applications/:id/documents', asyncHandler(async (req, res) => {
  const items = await DocumentFile.find({ applicationId: req.params.id, customerId: req.user.customerId, deletedAt: null }).lean();
  res.json({ items });
}));

router.post('/applications/:id/submit', asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, customerId: req.user.customerId });
  if (!application) throw httpError(404, 'Application not found');
  const body = parse(z.object({
    consents: z.array(z.object({ purpose: z.string(), textVersion: z.string() })).min(1),
  }), req.body);
  const form = await Form.findOne({ code: application.formCode }).lean();
  const version = form ? await FormVersion.findOne({ code: form.code, version: application.formVersion || form.publishedVersion }).lean() : null;
  const sections = version?.sections || form?.sections || [];
  const missing = [];
  sections.forEach((section) => (section.fields || []).forEach((field) => {
    if (field.required && (application.attributes?.[field.fieldCode] === undefined || application.attributes?.[field.fieldCode] === '')) missing.push(field.fieldCode);
  }));
  if (missing.length) throw httpError(400, 'Complete the required fields', { code: 'VALIDATION', details: { missing } });
  application.consents = body.consents.map((row) => ({ ...row, at: new Date(), ip: req.ip, device: req.get('user-agent') || '' }));
  application.stage = 'S1';
  application.status = 'SUBMITTED';
  application.submittedAt = new Date();
  await application.save();
  await StageHistory.create({ applicationId: application._id, fromStage: 'S0', toStage: 'S1', outcome: 'SUBMIT', customerMilestone: 'Application received', actorName: 'You' });
  const customer = await Customer.findById(application.customerId).lean();
  await notify('SUBMITTED', { id: customer._id, type: 'CUSTOMER', address: customer.mobile }, { customer, application, fallback: 'Application received.' });
  await runPreScreen(application._id);
  const fresh = await Application.findById(application._id).lean();
  res.json({ application: fresh });
}));

router.get('/applications', asyncHandler(async (req, res) => {
  const items = await Application.find({ customerId: req.user.customerId, deletedAt: null }).sort({ createdAt: -1 }).lean();
  res.json({ items });
}));

router.get('/applications/:id', asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, customerId: req.user.customerId }).lean();
  if (!application) throw httpError(404, 'Application not found');
  const history = await StageHistory.find({ applicationId: application._id }).sort({ at: 1 }).lean();
  const documents = await DocumentFile.find({ applicationId: application._id, deletedAt: null }).lean();
  res.json({ application, history, documents });
}));

router.post('/applications/:id/offer/accept', otpLimiter, asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, customerId: req.user.customerId });
  if (!application || application.status !== 'APPROVED') throw httpError(409, 'There is no offer to accept');
  const customer = await Customer.findById(application.customerId);
  if (!req.body.otp) {
    const code = otpCode();
    application.otpHash = sha256(code);
    await application.save();
    await notify('OTP_OFFER', { id: customer._id, address: customer.mobile, type: 'CUSTOMER' }, { fallback: `Your offer code is ${code}` });
    return res.json({ otpSent: true });
  }
  if (sha256(req.body.otp) !== application.otpHash) throw httpError(400, 'The code does not match');
  application.status = 'ACCEPTED';
  application.stage = 'S6';
  application.kfsAcceptedAt = new Date();
  application.checklist = [
    { code: 'MANDATE', label: 'Repayment mandate', state: 'PENDING' },
    { code: 'KYC', label: 'Identity pack', state: 'COMPLIED' },
  ];
  await application.save();
  await StageHistory.create({ applicationId: application._id, fromStage: 'S4', toStage: 'S6', outcome: 'ACCEPT', customerMilestone: 'Offer accepted', actorName: 'You' });
  res.json({ application });
}));

router.post('/applications/:id/offer/decline', asyncHandler(async (req, res) => {
  const application = await Application.findOne({ _id: req.params.id, customerId: req.user.customerId });
  if (!application) throw httpError(404, 'Application not found');
  application.status = 'OFFER_DECLINED';
  application.cancelReason = req.body.reason || '';
  await application.save();
  res.json({ application });
}));

router.get('/loans', asyncHandler(async (req, res) => {
  const items = await LoanAccount.find({ customerId: req.user.customerId }).sort({ createdAt: -1 }).lean();
  res.json({ items });
}));

router.get('/loans/:id', asyncHandler(async (req, res) => {
  const loan = await LoanAccount.findOne({ _id: req.params.id, customerId: req.user.customerId }).lean();
  if (!loan) throw httpError(404, 'Loan not found');
  res.json({ loan });
}));

router.post('/loans/:id/payments', asyncHandler(async (req, res) => {
  const loan = await LoanAccount.findOne({ _id: req.params.id, customerId: req.user.customerId });
  if (!loan) throw httpError(404, 'Loan not found');
  const body = parse(z.object({
    amount: z.number().positive(),
    method: z.string().default('LINKED_ACCOUNT'),
    idempotencyKey: z.string().min(4),
  }), req.body);
  const result = await postRepayment({ loanId: loan._id, amount: body.amount, channel: 'APP', method: body.method, idempotencyKey: body.idempotencyKey, actor: req.user, req });
  res.json(result);
}));

router.get('/loans/:id/settlement-quote', asyncHandler(async (req, res) => {
  const loan = await LoanAccount.findOne({ _id: req.params.id, customerId: req.user.customerId }).lean();
  if (!loan) throw httpError(404, 'Loan not found');
  const amount = Number(loan.principalOutstanding || 0) + Number(loan.interestDue || 0) + Number(loan.feesDue || 0) + Number(loan.lateChargesDue || 0);
  res.json({ amount, currency: loan.currency });
}));

router.get('/notifications', asyncHandler(async (req, res) => {
  const items = await Notification.find({ recipientId: req.user.customerId }).sort({ createdAt: -1 }).lean();
  const unread = items.filter((row) => !row.readAt).length;
  res.json({ items, unread });
}));

router.post('/notifications/:id/read', asyncHandler(async (req, res) => {
  const item = await Notification.findOne({ _id: req.params.id, recipientId: req.user.customerId });
  if (!item) throw httpError(404, 'Notification not found');
  item.readAt = new Date();
  await item.save();
  res.json({ item });
}));

router.get('/complaints', asyncHandler(async (req, res) => {
  const items = await Complaint.find({ customerId: req.user.customerId }).sort({ createdAt: -1 }).lean();
  res.json({ items });
}));

router.post('/complaints', asyncHandler(async (req, res) => {
  const body = parse(z.object({ subject: z.string().min(3), body: z.string().min(3) }), req.body);
  const seq = await nextSeq(Counter, 'complaint');
  const item = await Complaint.create({
    customerId: req.user.customerId,
    reference: `CMP${String(seq).padStart(6, '0')}`,
    subject: body.subject,
    body: body.body,
    slaDueAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  });
  res.status(201).json({ item });
}));

router.get('/masters/:code', asyncHandler(async (req, res) => {
  const list = await MasterList.findOne({ code: req.params.code, deletedAt: null }).lean();
  res.json({ values: (list?.values || []).filter((row) => row.status !== 'RETIRED') });
}));

router.post('/applications/:id/messages', asyncHandler(async (req, res) => {
  const { ApplicationMessage } = await import('../models/platformModels.js');
  const application = await Application.findOne({ _id: req.params.id, customerId: req.user.customerId });
  if (!application) throw httpError(404, 'Application not found');
  const item = await ApplicationMessage.create({ applicationId: application._id, from: 'CUSTOMER', body: req.body.body || '', internal: false });
  res.status(201).json({ item });
}));

export default router;
