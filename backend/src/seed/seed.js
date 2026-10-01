import path from 'path';
import { fileURLToPath } from 'url';
import { connectDb } from '../config/db.js';
import { hashPassword } from '../security/password.js';
import { syncCatalogue } from '../security/rbac.js';
import { PERMISSION_CODES } from '../security/permissions.js';
import { User, Role, SodRule } from '../modules/identity/model/User.js';
import { Product } from '../modules/products/model/Product.js';
import { ConfigEntry } from '../modules/configuration/model/ConfigEntry.js';
import { Scorecard } from '../modules/scorecards/model/Scorecard.js';
import { Rule } from '../modules/rules/model/Rule.js';
import { SEQUENCES } from '../engine/islamicEngine.js';
import {
  FieldDefinition, Form, FormVersion, Workflow, MasterList, Template, EscalationRule,
  Branch, Entity, Holiday, GLAccount, AccountingTemplate, ClassificationRegime,
  IntegrationConfig, ReportDefinition,
} from '../models/platformModels.js';
import mongoose from 'mongoose';

const TENANT = 'noor-horizon';

function config(key, level, scope, value) {
  return { key, scope: { level, ...scope }, value, version: 1, status: 'active', makerName: 'Seed', checkerName: 'Seed' };
}

function leg(side, gl, amount, name) {
  return { side, gl, amount, name };
}

const bands = {
  bureau: [{ min: 720, points: 100 }, { min: 680, points: 85 }, { min: 640, points: 70 }, { min: 600, points: 55 }, { min: 0, points: 20 }],
  capacity: [{ min: 80, points: 100 }, { min: 65, points: 80 }, { min: 50, points: 60 }, { min: 0, points: 20 }],
  salary: [{ min: 12, points: 100 }, { min: 6, points: 70 }, { min: 3, points: 45 }, { min: 0, points: 15 }],
  years: [{ min: 3, points: 100 }, { min: 1, points: 60 }, { min: 0, points: 25 }],
  stability: [{ min: 75, points: 90 }, { min: 60, points: 70 }, { min: 40, points: 50 }, { min: 0, points: 20 }],
};

function section(code, title, fields) {
  return { code, title: { en: title, ur: title, ar: title }, columns: 1, fields };
}

function field(fieldCode, required = true) {
  return { fieldCode, required, visibleWhen: '', editableWhen: '', helpText: '' };
}

const systemFields = [
  ['full_name', 'Full name', 'TEXT', 'CUSTOMER'],
  ['father_name', 'Father name', 'TEXT', 'CUSTOMER'],
  ['date_of_birth', 'Date of birth', 'DATE', 'CUSTOMER'],
  ['gender', 'Gender', 'LIST_SINGLE', 'CUSTOMER', 'genders'],
  ['cnic', 'Identity number', 'CNIC', 'CUSTOMER'],
  ['mobile', 'Mobile', 'MOBILE', 'CUSTOMER'],
  ['email', 'Email', 'EMAIL', 'CUSTOMER'],
  ['current_address', 'Current address', 'ADDRESS', 'CUSTOMER'],
  ['city', 'City', 'LIST_SINGLE', 'CUSTOMER', 'cities'],
  ['residence_type', 'Residence type', 'LIST_SINGLE', 'CUSTOMER', 'residence_types'],
  ['employment_type', 'Employment type', 'LIST_SINGLE', 'EMPLOYMENT', 'employment_types'],
  ['employer_name', 'Employer', 'LIST_SINGLE', 'EMPLOYMENT', 'employers'],
  ['gross_monthly_income', 'Gross monthly income', 'AMOUNT', 'EMPLOYMENT'],
  ['net_monthly_income', 'Net monthly income', 'AMOUNT', 'EMPLOYMENT'],
  ['monthly_obligations', 'Monthly obligations', 'AMOUNT', 'APPLICANT'],
  ['requested_amount', 'Requested amount', 'AMOUNT', 'APPLICATION'],
  ['tenor_months', 'Tenor (months)', 'INTEGER', 'APPLICATION'],
  ['purpose_code', 'Purpose', 'LIST_SINGLE', 'APPLICATION', 'purpose_codes'],
].map(([fieldCode, label, dataType, entityScope, lookupList]) => ({
  fieldCode,
  label: { en: label, ur: label, ar: label },
  dataType,
  entityScope,
  lookupList: lookupList || '',
  source: ['cnic', 'full_name', 'date_of_birth'].includes(fieldCode) ? 'PREFILL_NADRA' : 'USER_INPUT',
  isSystem: true,
  status: 'ACTIVE',
  piiClass: ['cnic', 'mobile', 'email', 'current_address'].includes(fieldCode) ? 'HIGH' : 'NONE',
  validation: { required: true },
}));

const workflowStages = [
  ['S0', 'Draft', 'Draft saved', 'application:create', ['SUBMIT']],
  ['S1', 'Submitted', 'Application received', 'application:view', []],
  ['S2', 'Credit review', 'Under review', 'application:recommend', ['APPROVE', 'DECLINE', 'RETURN', 'REFER']],
  ['S3', 'Referred', 'Under review', 'application:approve', ['APPROVE', 'DECLINE', 'RETURN']],
  ['S4', 'Offer', 'Approved', 'application:view', []],
  ['S5', 'Offer accepted', 'Offer accepted', 'application:view', []],
  ['S6', 'Final checks', 'Final checks', 'disbursement:initiate', ['APPROVE', 'RETURN']],
  ['S7', 'Disbursement', 'Funds sent', 'disbursement:authorise', ['APPROVE']],
  ['S8', 'Booked', 'Funds sent', 'loan:view', []],
].map(([code, name, customerMilestone, roleQueuePermission, allowedOutcomes]) => ({
  code, name, customerMilestone, roleQueuePermission, allowedOutcomes, slaHours: code === 'S2' ? 16 : 24, amberPct: 70,
  formBinding: code === 'S0' ? 'S0' : '', entryActions: [], checklist: [],
}));

const transitions = [
  { from: 'S0', outcome: 'SUBMIT', to: 'S1' },
  { from: 'S2', outcome: 'APPROVE', to: 'S4' },
  { from: 'S2', outcome: 'DECLINE', to: 'S2' },
  { from: 'S2', outcome: 'RETURN', to: 'S0' },
  { from: 'S2', outcome: 'REFER', to: 'S3' },
  { from: 'S3', outcome: 'APPROVE', to: 'S4' },
  { from: 'S3', outcome: 'DECLINE', to: 'S3' },
  { from: 'S3', outcome: 'RETURN', to: 'S2' },
  { from: 'S6', outcome: 'APPROVE', to: 'S7' },
  { from: 'S7', outcome: 'APPROVE', to: 'S8' },
];

function product(partial) {
  return {
    currency: 'PKR',
    jurisdiction: 'PK',
    status: 'PUBLISHED',
    version: 1,
    channels: ['MOBILE', 'BACKOFFICE'],
    showInCatalogue: true,
    workflowCode: 'WF-RETAIL',
    scorecardCode: 'SC-RET-UNS',
    glTemplateCode: 'RETAIL',
    amountStep: 5000,
    tenorStep: 6,
    feeRate: 0.01,
    minRate: 0.12,
    maxRate: 0.28,
    affordabilityMode: 'dbr',
    repaymentMode: 'auto_debit',
    documentRequirements: [
      { code: 'CNIC', label: 'Identity card' },
      { code: 'SALARY_SLIP', label: 'Salary slip' },
    ],
    presentation: { benefits: ['Fixed instalment', 'Early settlement'], displayOrder: 1 },
    ...partial,
  };
}

const accounts = [
  ['1000', 'Cash and bank', 'ASSET'],
  ['1310', 'Loans receivable', 'ASSET'],
  ['1320', 'Interest receivable', 'ASSET'],
  ['1330', 'Fees receivable', 'ASSET'],
  ['1390', 'Provision reserve', 'ASSET'],
  ['1990', 'Disbursement clearing', 'ASSET'],
  ['2100', 'Excess payments', 'LIABILITY'],
  ['2300', 'Charity payable', 'LIABILITY'],
  ['4100', 'Fee income', 'INCOME'],
  ['4150', 'Insurance payable', 'LIABILITY'],
  ['4200', 'Interest income', 'INCOME'],
  ['4300', 'Late charge income', 'INCOME'],
  ['4800', 'Recovery income', 'INCOME'],
  ['6100', 'Provision expense', 'EXPENSE'],
  ['6800', 'Write-off expense', 'EXPENSE'],
  ['9100', 'Memo interest suspense', 'MEMO'],
  ['9101', 'Memo interest offset', 'MEMO'],
];

const events = {
  E1: ['Disbursement', [leg('DR', '1310', 'principal', 'Loans'), leg('CR', '1990', 'principal', 'Clearing')]],
  E2: ['Fee deducted', [leg('DR', '1990', 'fees', 'Clearing'), leg('CR', '4100', 'fees', 'Fee income')]],
  E3: ['Insurance deducted', [leg('DR', '1990', 'insurance', 'Clearing'), leg('CR', '4150', 'insurance', 'Insurance')]],
  E4: ['Interest accrual', [leg('DR', '1320', 'interest', 'Receivable'), leg('CR', '4200', 'interest', 'Income')]],
  E5: ['Late charge', [leg('DR', '1330', 'charges', 'Fees'), leg('CR', '4300', 'charges', 'Income')]],
  E6: ['Repayment', [
    leg('DR', '1000', 'amount', 'Bank'), leg('CR', '1310', 'principal', 'Loans'), leg('CR', '4200', 'interest', 'Income'),
    leg('CR', '4100', 'fees', 'Fees'), leg('CR', '2300', 'charity', 'Charity'), leg('CR', '2100', 'excess', 'Excess'),
  ]],
  E12: ['NPL memo accrual', [leg('DR', '9100', 'interest', 'Memo'), leg('CR', '9101', 'interest', 'Memo offset')]],
  E14: ['Provision charge', [leg('DR', '6100', 'provisionDelta', 'Expense'), leg('CR', '1390', 'provisionDelta', 'Reserve')]],
  E15: ['Provision release', [leg('DR', '1390', 'provisionDelta', 'Reserve'), leg('CR', '6100', 'provisionDelta', 'Expense')]],
  E16: ['Write-off', [leg('DR', '6800', 'principal', 'Expense'), leg('CR', '1310', 'principal', 'Loans')]],
  E17: ['Recovery', [leg('DR', '1000', 'amount', 'Bank'), leg('CR', '4800', 'amount', 'Recovery')]],
  E22: ['Customer payout', [leg('DR', '1990', 'netDisbursed', 'Clearing'), leg('CR', '1000', 'netDisbursed', 'Bank')]],
};

const captureFields = [
  field('requested_amount'), field('tenor_months'), field('purpose_code', false),
  field('employment_type'), field('employer_name', false), field('gross_monthly_income'), field('net_monthly_income'), field('monthly_obligations', false),
];

export async function runSeed({ disconnect = true } = {}) {
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_INITIAL_PASSWORD is required. Set it in backend/.env before seeding. The API will not invent a password.');
  }
  const passwordHash = await hashPassword(password);
  await connectDb();
  await mongoose.connection.dropDatabase();
  await syncCatalogue();
  const superRole = await Role.findOne({ code: 'SUPER_ADMIN' });
  superRole.permissions = PERMISSION_CODES;
  superRole.isSystem = true;
  superRole.maxScope = 'ALL';
  superRole.doa = [{ productFamily: '*', maxAmount: 999999999999, maxExposure: 999999999999, maxDeviationLevel: 'D3', maxRateConcessionBps: 10000, maxFeeWaiverPct: 100, maxTenorMonths: 360 }];
  await superRole.save();

  await User.create({
    username: 'admin',
    name: 'System Administrator',
    email: 'admin@local',
    passwordHash,
    mustChangePassword: true,
    status: 'ACTIVE',
    tenantId: TENANT,
    entityId: 'PK-01',
    branchId: '0001',
    roles: [{ roleId: superRole._id, scopeType: 'ALL', scopeId: '' }],
  });

  await SodRule.create([
    { code: 'SOD-APP', permissionA: 'application:create', permissionB: 'application:approve', level: 'CASE', action: 'BLOCK', description: 'The maker of an application cannot approve it' },
    { code: 'SOD-GL', permissionA: 'gl:manual_journal', permissionB: 'gl:approve_journal', level: 'CASE', action: 'BLOCK', description: 'The maker of a journal cannot approve it' },
    { code: 'SOD-SET', permissionA: 'collection:settle_propose', permissionB: 'collection:settle_approve', level: 'CASE', action: 'BLOCK', description: 'The maker of a settlement cannot approve it' },
    { code: 'SOD-DISB', permissionA: 'disbursement:initiate', permissionB: 'disbursement:authorise', level: 'CASE', action: 'WARN', description: 'Disbursement initiation and authorisation should be separate' },
  ]);

  await FieldDefinition.create(systemFields);
  const personalSections = [
    section('facility', 'Facility', [field('requested_amount'), field('tenor_months'), field('purpose_code', false)]),
    section('income', 'Income', [field('employment_type'), field('employer_name', false), field('gross_monthly_income'), field('net_monthly_income'), field('monthly_obligations', false)]),
  ];
  for (const code of ['FORM-PF-SAL', 'FORM-PF-ISL', 'FORM-AUTO-IJR']) {
    const productCode = code.replace('FORM-', '');
    const sections = JSON.parse(JSON.stringify(personalSections));
    const form = await Form.create({
      code, name: `${productCode} application`, status: 'ACTIVE', publishedVersion: 1,
      binding: { productCode, stage: 'S0', channel: 'MOBILE', applicantRole: 'PRIMARY' },
      sections,
    });
    await FormVersion.create({ formId: form._id, code, version: 1, sections, binding: form.binding, hash: code, publishedAt: new Date() });
  }

  await Workflow.create({ code: 'WF-RETAIL', name: 'Retail origination', status: 'ACTIVE', publishedVersion: 0, stages: workflowStages, transitions });
  await MasterList.create([
    { code: 'cities', name: 'Cities', values: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad'].map((name, index) => ({ code: name.toUpperCase(), value: { en: name, ur: name, ar: name }, sortOrder: index, status: 'ACTIVE' })) },
    { code: 'provinces', name: 'Provinces', values: ['Sindh', 'Punjab', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad'].map((name) => ({ code: name.slice(0, 3).toUpperCase(), value: { en: name }, status: 'ACTIVE' })) },
    { code: 'employers', name: 'Employers', values: [
      { code: 'NORTHWIND', value: { en: 'Northwind Digital' }, attributes: { category: 'A' }, status: 'ACTIVE' },
      { code: 'CITY-SCHOOLS', value: { en: 'City Schools' }, attributes: { category: 'B' }, status: 'ACTIVE' },
      { code: 'PUBLIC-WORKS', value: { en: 'Public Works' }, attributes: { category: 'A' }, status: 'ACTIVE' },
    ] },
    { code: 'industries', name: 'Industries', values: ['Services', 'Manufacturing', 'Trade'].map((name) => ({ code: name.toUpperCase(), value: { en: name }, status: 'ACTIVE' })) },
    { code: 'purpose_codes', name: 'Purpose codes', values: ['Education', 'Medical', 'Home improvement', 'Working capital'].map((name) => ({ code: name.slice(0, 4).toUpperCase(), value: { en: name }, status: 'ACTIVE' })) },
    { code: 'document_types', name: 'Document types', values: ['Identity card', 'Salary slip', 'Bank statement'].map((name) => ({ code: name.slice(0, 4).toUpperCase(), value: { en: name }, status: 'ACTIVE' })) },
    { code: 'reason_codes', name: 'Reason codes', values: ['Income', 'Policy', 'Customer request', 'Document'].map((name) => ({ code: name.slice(0, 4).toUpperCase(), value: { en: name }, status: 'ACTIVE' })) },
    { code: 'banks', name: 'Banks', values: [{ code: 'NB', value: { en: 'Noor Horizon Bank' }, attributes: { imd: '999999' }, status: 'ACTIVE' }] },
    { code: 'wallets', name: 'Wallets', values: [{ code: 'EASY', value: { en: 'Demo Wallet' }, status: 'ACTIVE' }] },
    { code: 'relationships', name: 'Relationships', values: ['Self', 'Spouse', 'Parent'].map((name) => ({ code: name.toUpperCase(), value: { en: name }, status: 'ACTIVE' })) },
    { code: 'collateral_types', name: 'Collateral types', values: ['Vehicle', 'Property', 'Cash'].map((name) => ({ code: name.toUpperCase(), value: { en: name }, status: 'ACTIVE' })) },
    { code: 'colours', name: 'Colours', values: ['White', 'Black', 'Silver', 'Blue'].map((name) => ({ code: name.toUpperCase(), value: { en: name }, status: 'ACTIVE' })) },
    { code: 'genders', name: 'Genders', values: ['Female', 'Male'].map((name) => ({ code: name[0], value: { en: name }, status: 'ACTIVE' })) },
    { code: 'residence_types', name: 'Residence types', values: ['Owned', 'Rented', 'Family'].map((name) => ({ code: name.toUpperCase(), value: { en: name }, status: 'ACTIVE' })) },
    { code: 'employment_types', name: 'Employment types', values: ['Salaried', 'Self employed'].map((name) => ({ code: name.toUpperCase().replace(' ', '_'), value: { en: name }, status: 'ACTIVE' })) },
  ]);

  await Branch.create([
    { code: '0001', name: 'Karachi Clifton', regionCode: 'SOUTH', entityId: 'PK-01' },
    { code: '0002', name: 'Karachi Gulshan', regionCode: 'SOUTH', entityId: 'PK-01' },
    { code: '0003', name: 'Lahore Gulberg', regionCode: 'NORTH', entityId: 'PK-01' },
    { code: '0004', name: 'Islamabad F-7', regionCode: 'NORTH', entityId: 'PK-01' },
  ]);
  await Entity.create({ code: 'PK-01', name: 'Pakistan', currency: 'PKR', businessDate: new Date().toISOString().slice(0, 10), status: 'ACTIVE' });
  await Holiday.create({ entityId: 'PK-01', date: `${new Date().getFullYear()}-12-25`, name: 'Year-end holiday', status: 'ACTIVE' });

  await GLAccount.create(accounts.map(([code, name, type]) => ({ code, name, type, currency: 'PKR', memo: type === 'MEMO', status: 'ACTIVE' })));
  await AccountingTemplate.create(Object.entries(events).map(([eventCode, [name, legs]]) => ({ eventCode, name, legs, status: 'ACTIVE' })));
  ['E7', 'E8', 'E9', 'E10', 'E11', 'E13', 'E18', 'E19', 'E20', 'E21'].forEach(() => {});
  await AccountingTemplate.create(['E7', 'E8', 'E9', 'E10', 'E11', 'E13', 'E18', 'E19', 'E20', 'E21'].map((eventCode) => ({
    eventCode, name: eventCode, legs: [leg('DR', '1000', '0', 'Bank'), leg('CR', '1000', '0', 'Bank')], status: 'ACTIVE',
  })));

  await ClassificationRegime.create({
    code: 'PK-CONSUMER',
    name: 'Pakistan consumer',
    status: 'ACTIVE',
    bands: [
      { from: 0, to: 89, category: 'Regular', provisionRate: 0, bucket: 'Current' },
      { from: 90, to: 179, category: 'Substandard', provisionRate: 0.25, bucket: '90+' },
      { from: 180, to: 364, category: 'Doubtful', provisionRate: 0.5, bucket: '180+' },
      { from: 365, to: 99999, category: 'Loss', provisionRate: 1, bucket: '365+' },
    ],
    ifrs: { stage1: [0, 59], stage2: [60, 89], stage3: [90, 99999] },
    pdLgd: { pd: { 1: 0.015, 2: 0.08, 3: 0.4 }, lgd: { secured: 0.35, unsecured: 0.65 } },
  });

  await ConfigEntry.create([
    config('regulatory.dbr', 'system', {}, { maxDbr: 0.4, minAge: 21, maxAge: 60, maxAgeAtMaturity: 65, offerValidityDays: 7 }),
    config('pricing.bands', 'system', {}, { floorRate: 0.08, capRate: 0.28, relationshipYears: 3, relationshipDiscount: 0.005, grades: [{ minScore: 80, premium: 0, label: 'A' }, { minScore: 72, premium: 0.005, label: 'B' }, { minScore: 55, premium: 0.015, label: 'C' }] }),
    config('doa.matrix', 'system', {}, { stpLimit: 1500000, officerLimit: 5000000 }),
    config('fraud.thresholds', 'system', {}, { duplicateRefer: 2, duplicateDecline: 4 }),
    config('islamic.sequences', 'system', {}, SEQUENCES),
    config('bank.profile', 'tenant', { tenantId: TENANT }, { name: 'Noor Horizon Bank', shortName: 'Noor Horizon', city: 'Karachi', demo: true }),
    config('security.allowSelfAuthorisation', 'system', {}, { enabled: true }),
    config('security.mfaRequired', 'system', {}, { enabled: false }),
  ]);

  await Scorecard.create({
    code: 'SC-RET-UNS', name: 'Retail unsecured scorecard', version: 1, status: 'active', champion: true,
    products: ['PF-SAL', 'PF-ISL', 'AUTO-IJR'], segments: ['salaried'], approveCutoff: 60, referCutoff: 45,
    factors: [
      { key: 'bureauScore', label: 'Bureau', weight: 40, bands: bands.bureau },
      { key: 'capacityScore', label: 'Capacity', weight: 25, bands: bands.capacity },
      { key: 'salaryMonths', label: 'Salary continuity', weight: 15, bands: bands.salary },
      { key: 'relationshipYears', label: 'Relationship', weight: 10, bands: bands.years },
      { key: 'cashflowStability', label: 'Stability', weight: 10, bands: bands.stability },
    ],
    makerName: 'Seed', checkerName: 'Seed',
  });

  await Rule.create([
    { code: 'R-EL-INCOME', name: 'Minimum gross income', stage: 'eligibility', ruleType: 'ELIGIBILITY', priority: 10, appliesTo: { products: ['*'], segments: ['*'], jurisdictions: ['PK'] }, when: { all: [{ field: 'gross_monthly_income', op: 'lt', value: 40000 }] }, then: { outcome: 'decline', reasonCode: 'ELIG_INCOME', stop: true }, enabled: true, status: 'active', version: 1 },
    { code: 'R-POL-AMOUNT', name: 'Large ticket deviation', stage: 'policy', ruleType: 'POLICY', deviationLevel: 'D1', priority: 20, appliesTo: { products: ['*'], segments: ['*'], jurisdictions: ['PK'] }, when: { all: [{ field: 'requestedAmount', op: 'gt', value: 2500000 }] }, then: { outcome: 'refer', reasonCode: 'POLICY_AMOUNT', stop: false, level: 'D1' }, enabled: true, status: 'active', version: 1 },
  ]);

  await Product.create([
    product({ code: 'PF-SAL', shortCode: 'PFS', name: 'Personal Finance Salaried', family: 'PERSONAL', structure: 'CONVENTIONAL', contractType: 'conventional', segment: 'salaried', minAmount: 50000, maxAmount: 3000000, minTenor: 6, maxTenor: 60, baseRate: 0.2, summary: 'Instalment finance for salaried customers.', presentation: { cardTitle: 'Personal Finance', shortDescription: 'Salaried personal finance up to the published limit.', benefits: ['Fixed instalment', 'No hidden fee'], displayOrder: 1 } }),
    product({ code: 'PF-ISL', shortCode: 'PFI', name: 'Islamic Personal Finance Murabaha', family: 'PERSONAL', structure: 'MURABAHA', contractType: 'murabaha', segment: 'salaried', minAmount: 50000, maxAmount: 3000000, minTenor: 6, maxTenor: 60, baseRate: 0.18, latePaymentCharity: true, summary: 'Murabaha personal finance.', presentation: { cardTitle: 'Islamic Personal Finance', shortDescription: 'Murabaha finance with a declared profit.', benefits: ['Declared profit', 'Charity on late payment'], displayOrder: 2 } }),
    product({ code: 'AUTO-IJR', shortCode: 'AIJ', name: 'Auto Ijarah', family: 'AUTO', structure: 'IJARAH', contractType: 'ijarah', segment: 'salaried', minAmount: 300000, maxAmount: 8000000, minTenor: 12, maxTenor: 60, baseRate: 0.16, latePaymentCharity: true, summary: 'Vehicle ijarah.', presentation: { cardTitle: 'Auto Ijarah', shortDescription: 'Use a vehicle under ijarah and own it at the end.', benefits: ['Vehicle use', 'Ownership path'], displayOrder: 3 } }),
  ]);

  const notices = [
    ['OTP_REGISTER', 'SMS', 'Verification code'],
    ['OTP_OFFER', 'SMS', 'Offer code'],
    ['SUBMITTED', 'IN_APP', 'Application received'],
    ['UNDER_REVIEW', 'IN_APP', 'Under review'],
    ['APPROVED', 'IN_APP', 'Approved — offer ready'],
    ['DECLINED', 'IN_APP', 'Application update'],
    ['DOC_REJECTED', 'IN_APP', 'Action needed'],
    ['DISBURSED', 'IN_APP', 'Funds sent'],
    ['PAYMENT_RECEIVED', 'IN_APP', 'Payment received'],
    ['INSTALMENT_REMINDER', 'SMS', 'Instalment reminder'],
    ['OVERDUE', 'SMS', 'Payment overdue'],
    ['ACTION_NEEDED', 'IN_APP', 'Action needed'],
  ];
  await Template.create(notices.map(([code, channel, subject]) => ({ code, kind: code, name: subject, channel, subject, body: '{{fallback}}', status: 'ACTIVE' })));
  await EscalationRule.create({ code: 'ESC-SLA', name: 'Stage SLA', trigger: 'SLA_BREACH', clockHours: 16, levels: [{ level: 1, permission: 'application:approve' }], status: 'ACTIVE' });
  await IntegrationConfig.create([
    ['IDENTITY', 'Identity', 'Identity'],
    ['BUREAU', 'Bureau', 'Bureau'],
    ['AML', 'AML screening', 'AML'],
    ['CBS', 'Core banking', 'Core'],
    ['PAYMENT', 'Payments', 'Payments'],
    ['SMS', 'SMS', 'Messaging'],
    ['EMAIL', 'Email', 'Messaging'],
  ].map(([code, name, domain]) => ({ code, name, domain, implementation: 'mock', enabled: true, fallback: code === 'BUREAU' ? 'MANUAL' : 'PROCEED_FLAG', status: 'ACTIVE' })));

  const reports = [
    ['APP-REG', 'Application register', 'applications'],
    ['SANCTION', 'Sanction and deviation register', 'applications'],
    ['DISB', 'Disbursement register', 'loans'],
    ['RECEIPTS', 'Repayment register', 'transactions'],
    ['DPD', 'Overdue and DPD ageing', 'loans'],
    ['CLASS', 'Classification statement', 'loans'],
    ['ECL', 'IFRS 9 stage', 'loans'],
    ['WRITEOFF', 'Write-off register', 'loans'],
    ['RESTRUCTURE', 'Restructured loans', 'loans'],
    ['CONSENT', 'Consent register', 'customers'],
    ['COMPLAINT', 'Complaints register', 'customers'],
  ];
  await ReportDefinition.create(reports.map(([code, name, dataSource]) => ({ code, name, purpose: name, dataSource, columns: [], status: 'ACTIVE' })));

  const users = await User.countDocuments();
  console.log(`Seed complete. Staff users: ${users}. Sign in as admin and change the password from ADMIN_INITIAL_PASSWORD.`);
  if (disconnect) await mongoose.disconnect();
}

export async function runSeedConnected() {
  return runSeed({ disconnect: false });
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invoked) {
  runSeed().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
