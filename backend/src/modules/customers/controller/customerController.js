import { z } from 'zod';
import { Customer, Consent } from '../model/Customer.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { decryptField, maskCnic } from '../../../security/crypto.js';
import { writeAudit } from '../../../security/audit.js';
import { ROLES } from '../../../security/roles.js';

const REVEAL_ROLES = [ROLES.COMPLIANCE, ROLES.AUDITOR, ROLES.SYSTEM_ADMIN];

export function presentCustomer(customer, { reveal = false } = {}) {
  return {
    id: customer._id,
    customerNo: customer.customerNo,
    fullName: customer.fullName,
    nameUr: customer.nameUr,
    city: customer.city,
    segment: customer.segment,
    residency: customer.residency,
    employmentType: customer.employmentType,
    employer: customer.employer,
    monthlyIncome: customer.monthlyIncome,
    monthlyObligations: customer.monthlyObligations,
    salaryMonths: customer.salaryMonths,
    cashflowMonthly: customer.cashflowMonthly,
    cashflowStability: customer.cashflowStability,
    altDataQuality: customer.altDataQuality,
    relationshipYears: customer.relationshipYears,
    existingExposure: customer.existingExposure,
    bureauScore: customer.bureauScore,
    bureauWorstDpd: customer.bureauWorstDpd,
    kycStatus: customer.kycStatus,
    preferredLanguage: customer.preferredLanguage,
    preferredChannel: customer.preferredChannel,
    lifeEvents: customer.lifeEvents,
    salaryStopped: customer.salaryStopped,
    pepFlag: customer.pepFlag,
    holdout: customer.holdout,
    onTimePayments: customer.onTimePayments,
    jurisdiction: customer.jurisdiction,
    branchId: customer.branchId,
    accountMasked: customer.accountMasked,
    blurb: customer.blurb,
    age: customer.age,
    cnic: reveal ? decryptField(customer.cnicEncrypted) : maskCnic(customer.cnicLast4),
    phone: reveal ? decryptField(customer.phoneEncrypted) : `••••••${customer.phoneLast4 || ''}`,
  };
}

async function ownOrStaff(req, customer) {
  if (req.user.role === ROLES.CUSTOMER && req.user.customerId !== String(customer._id)) {
    throw httpError(403, 'You do not have access to this customer');
  }
}

export const me = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user.customerId);
  if (!customer) throw httpError(404, 'Customer profile not found');
  res.json({ customer: presentCustomer(customer, { reveal: true }) });
});

export const list = asyncHandler(async (req, res) => {
  const filter = { tenantId: req.user.tenantId };
  if (req.query.segment) filter.segment = String(req.query.segment);
  const customers = await Customer.find(filter).sort({ fullName: 1 }).lean();
  res.json({ customers: customers.map((customer) => presentCustomer(customer)) });
});

export const getOne = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw httpError(404, 'Customer not found');
  await ownOrStaff(req, customer);
  const reveal = req.query.reveal === '1' && REVEAL_ROLES.includes(req.user.role);
  if (reveal) {
    await writeAudit(req, { action: 'pii_reveal', resource: 'customer', resourceId: customer._id, detail: { field: 'cnic' } });
  }
  const consents = await Consent.find({ customerId: customer._id }).sort({ createdAt: -1 }).lean();
  res.json({ customer: presentCustomer(customer, { reveal: reveal || req.user.role === ROLES.CUSTOMER }), consents });
});

export const grantConsent = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    purposes: z.array(z.enum(['identity', 'bureau', 'salary', 'open_banking', 'marketing', 'alternative_data'])).min(1),
    applicationId: z.string().optional(),
    channel: z.string().default('app'),
  }), req.body);
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw httpError(404, 'Customer not found');
  await ownOrStaff(req, customer);
  const expiresAt = new Date(Date.now() + 180 * 24 * 3600 * 1000);
  const rows = await Consent.insertMany(body.purposes.map((purpose) => ({
    tenantId: customer.tenantId,
    customerId: customer._id,
    applicationId: body.applicationId,
    purpose,
    scope: purpose,
    channel: body.channel,
    expiresAt,
    actorId: req.user.id,
  })));
  if (body.purposes.includes('marketing')) customer.marketingRevoked = false;
  await customer.save();
  await writeAudit(req, { action: 'consent_grant', resource: 'customer', resourceId: customer._id, detail: { purposes: body.purposes } });
  res.status(201).json({ consents: rows });
});

export const revokeConsent = asyncHandler(async (req, res) => {
  const body = parse(z.object({ purpose: z.string() }), req.body);
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw httpError(404, 'Customer not found');
  await ownOrStaff(req, customer);
  await Consent.updateMany({ customerId: customer._id, purpose: body.purpose, revokedAt: null }, { revokedAt: new Date() });
  if (body.purpose === 'marketing') customer.marketingRevoked = true;
  await customer.save();
  await writeAudit(req, { action: 'consent_revoke', resource: 'customer', resourceId: customer._id, detail: { purpose: body.purpose } });
  res.json({ ok: true });
});
