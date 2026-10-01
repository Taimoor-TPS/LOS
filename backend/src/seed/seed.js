import { connectDb } from '../config/db.js';
import { hashPassword } from '../security/password.js';
import { encryptField, last4 } from '../security/crypto.js';
import { ageFromDob, buildSchedule, quotePayment } from '../engine/money.js';
import { HBL_CODES, hblProducts } from '../catalogue/hblProducts.js';
import { sequenceFor } from '../engine/islamicEngine.js';
import { SEQUENCES } from '../engine/islamicEngine.js';
import { decideApplication, loadPolicy } from '../engine/decisionService.js';
import { User } from '../modules/identity/model/User.js';
import { Customer, Consent } from '../modules/customers/model/Customer.js';
import { Product } from '../modules/products/model/Product.js';
import { ConfigEntry } from '../modules/configuration/model/ConfigEntry.js';
import { Scorecard } from '../modules/scorecards/model/Scorecard.js';
import { Rule } from '../modules/rules/model/Rule.js';
import { Application, DecisionRecord, Counter } from '../modules/applications/model/Application.js';
import { Offer, Campaign } from '../modules/engagement/model/Offer.js';
import { LoanAccount, ServicingRequest } from '../modules/servicing/model/LoanAccount.js';
import { AuditLog } from '../modules/compliance/model/AuditLog.js';
import { Scheme } from '../modules/schemes/model/Scheme.js';
import { Dealer } from '../modules/dealers/model/Dealer.js';
import { EarlyWarning } from '../modules/earlywarning/model/EarlyWarning.js';
import { ModelCard } from '../modules/modelrisk/model/ModelCard.js';
import { AdapterRun } from '../modules/integrations/model/AdapterRun.js';
import { DocumentTemplate } from '../modules/documents/model/DocumentTemplate.js';

const TENANT = 'noor-horizon';
const PASSWORD = 'Los@Demo2026';

const bands = {
  bureau: [{ min: 720, points: 100 }, { min: 680, points: 85 }, { min: 640, points: 70 }, { min: 600, points: 55 }, { min: 0, points: 20 }],
  capacity: [{ min: 80, points: 100 }, { min: 65, points: 80 }, { min: 50, points: 60 }, { min: 0, points: 20 }],
  salary: [{ min: 12, points: 100 }, { min: 6, points: 70 }, { min: 3, points: 45 }, { min: 0, points: 15 }],
  years: [{ min: 3, points: 100 }, { min: 1, points: 60 }, { min: 0, points: 25 }],
  stability: [{ min: 75, points: 90 }, { min: 60, points: 70 }, { min: 40, points: 50 }, { min: 0, points: 20 }],
  alt: [{ min: 75, points: 90 }, { min: 60, points: 75 }, { min: 50, points: 55 }, { min: 0, points: 20 }],
};

const products = hblProducts;

function card(partial) {
  return { version: 1, status: 'active', champion: true, pd: { midpoint: 50, slope: 8 }, makerName: 'Seed', checkerName: 'Model risk', ...partial };
}

const scorecards = [
  card({ code: 'SC-RET-UNS', name: 'Retail unsecured scorecard', products: [HBL_CODES.PL, HBL_CODES.IPF], segments: ['salaried', 'self_employed', 'expat'], approveCutoff: 72, referCutoff: 55, factors: [
    { key: 'bureauScore', label: 'Bureau', weight: 30, bands: bands.bureau },
    { key: 'capacityScore', label: 'Affordability headroom', weight: 25, bands: bands.capacity },
    { key: 'salaryMonths', label: 'Salary continuity', weight: 20, bands: bands.salary },
    { key: 'relationshipYears', label: 'Relationship', weight: 15, bands: bands.years },
    { key: 'cashflowStability', label: 'Balance stability', weight: 10, bands: bands.stability },
  ] }),
  card({ code: 'SC-SME-OBL', name: 'SME obligor scorecard', products: [HBL_CODES.SW, HBL_CODES.SM], segments: ['sme'], approveCutoff: 70, referCutoff: 55, factors: [
    { key: 'cashflowStability', label: 'Cash-flow stability', weight: 30, bands: bands.stability },
    { key: 'capacityScore', label: 'Cover', weight: 30, bands: bands.capacity },
    { key: 'bureauScore', label: 'Bureau', weight: 25, bands: bands.bureau },
    { key: 'relationshipYears', label: 'Relationship', weight: 15, bands: bands.years },
  ] }),
  card({ code: 'SC-RET-AST', name: 'Retail asset scorecard', products: [HBL_CODES.AL, HBL_CODES.AI], segments: ['salaried', 'self_employed', 'expat'], approveCutoff: 72, referCutoff: 55, factors: [
    { key: 'bureauScore', label: 'Bureau', weight: 25, bands: bands.bureau },
    { key: 'capacityScore', label: 'Affordability', weight: 30, bands: bands.capacity },
    { key: 'salaryMonths', label: 'Income continuity', weight: 20, bands: bands.salary },
    { key: 'relationshipYears', label: 'Relationship', weight: 15, bands: bands.years },
    { key: 'cashflowStability', label: 'Stability', weight: 10, bands: bands.stability },
  ] }),
  card({ code: 'SC-RET-MTG', name: 'Retail mortgage scorecard', products: [HBL_CODES.HL, HBL_CODES.HD], segments: ['salaried', 'self_employed', 'expat'], approveCutoff: 74, referCutoff: 58, factors: [
    { key: 'bureauScore', label: 'Bureau', weight: 25, bands: bands.bureau },
    { key: 'capacityScore', label: 'Affordability', weight: 30, bands: bands.capacity },
    { key: 'salaryMonths', label: 'Income continuity', weight: 20, bands: bands.salary },
    { key: 'relationshipYears', label: 'Relationship', weight: 15, bands: bands.years },
    { key: 'cashflowStability', label: 'Stability', weight: 10, bands: bands.stability },
  ] }),
];

function config(key, level, scope, value) {
  return { key, scope: { level, ...scope }, value, version: 1, status: 'active', makerName: 'Credit policy', checkerName: 'Compliance', comment: 'Illustrative pack. Confirm with the current circular before live lending.' };
}

const people = [
  { key: 'ayesha', fullName: 'Ayesha Khan', nameUr: 'عائشہ خان', email: 'ayesha.khan@customer.demo', cnic: '4210112345671', phone: '03001234567', dob: '1994-04-12', city: 'Karachi', segment: 'salaried', employmentType: 'salaried', employer: 'Northwind Digital', monthlyIncome: 185000, monthlyObligations: 35000, salaryMonths: 14, cashflowMonthly: 185000, cashflowStability: 78, altDataQuality: 40, relationshipYears: 4, existingExposure: 180000, bureauScore: 742, onTimePayments: 6, lifeEvents: ['salary_rise'], accountMasked: '****1234', blurb: 'Pre-approved after 14 steady salary credits.', branchId: 'khi-clifton' },
  { key: 'farooq', fullName: 'Farooq Ahmed', nameUr: 'فاروق احمد', email: 'farooq.ahmed@customer.demo', cnic: '4220198765432', phone: '03007654321', dob: '1991-09-02', city: 'Karachi', segment: 'salaried', employmentType: 'salaried', employer: 'Habib Trading', monthlyIncome: 200000, monthlyObligations: 20000, salaryMonths: 7, cashflowStability: 45, relationshipYears: 1, bureauScore: 630, accountMasked: '****4481', blurb: 'Score sits in the review band.', branchId: 'khi-gulshan' },
  { key: 'nida', fullName: 'Nida Pervez', nameUr: 'ندا پرویز', email: 'nida.pervez@customer.demo', cnic: '4210155512348', phone: '03015551234', dob: '1996-01-20', city: 'Lahore', segment: 'salaried', employmentType: 'salaried', employer: 'City Schools', monthlyIncome: 100000, monthlyObligations: 48000, salaryMonths: 18, cashflowStability: 60, relationshipYears: 2, bureauScore: 690, accountMasked: '****2201', blurb: 'Instalment would cross the affordability cap.', branchId: 'lhe-gulberg' },
  { key: 'hamza', fullName: 'Hamza Qureshi', nameUr: 'حمزہ قریشی', email: 'hamza.qureshi@customer.demo', cnic: '4230188899913', phone: '03218889991', dob: '1985-06-18', city: 'Karachi', segment: 'sme', employmentType: 'self_employed', employer: 'Qureshi Electricals', monthlyIncome: 0, monthlyObligations: 90000, cashflowMonthly: 420000, cashflowStability: 80, relationshipYears: 5, bureauScore: 700, salaryMonths: 24, accountMasked: '****9012', blurb: 'Working capital above the committee threshold.', branchId: 'khi-clifton' },
  { key: 'sana', fullName: 'Sana Iqbal', nameUr: 'ثنا اقبال', email: 'sana.iqbal@customer.demo', cnic: '4210100045676', phone: '03330004567', dob: '2001-11-03', city: 'Karachi', segment: 'salaried', employmentType: 'salaried', employer: 'Studio payroll', monthlyIncome: 55000, monthlyObligations: 5000, salaryMonths: 8, cashflowStability: 62, altDataQuality: 76, relationshipYears: 1, bureauScore: 610, accountMasked: '****6670', blurb: 'Income fits a personal loan. The score sits in review.', branchId: 'khi-clifton' },
  { key: 'adeel', fullName: 'Adeel Mir', nameUr: 'عدیل میر', email: 'adeel.mir@customer.demo', cnic: '6110199911125', phone: '03019991112', dob: '1988-02-14', city: 'Islamabad', segment: 'salaried', employmentType: 'salaried', employer: 'Public Works', monthlyIncome: 220000, monthlyObligations: 30000, salaryMonths: 20, cashflowStability: 80, relationshipYears: 6, bureauScore: 760, pepFlag: true, accountMasked: '****1188', blurb: 'PEP flag routes the case to review.', branchId: 'isb-f7' },
  { key: 'bilal', fullName: 'Bilal Hassan', nameUr: 'بلال حسن', email: 'bilal.hassan@customer.demo', cnic: '4210177700019', phone: '03017770001', dob: '1990-08-08', city: 'Karachi', segment: 'salaried', employmentType: 'salaried', employer: 'Former retailer', monthlyIncome: 90000, monthlyObligations: 15000, salaryMonths: 0, salaryStopped: true, cashflowStability: 20, relationshipYears: 3, bureauScore: 640, accountMasked: '****3004', blurb: 'Salary credits have stopped.', branchId: 'khi-gulshan' },
  { key: 'nadia', fullName: 'Nadia Control', nameUr: 'نادیہ کنٹرول', email: 'nadia.control@customer.demo', cnic: '4210122200094', phone: '03012220009', dob: '1993-03-03', city: 'Karachi', segment: 'salaried', employmentType: 'salaried', employer: 'Holdout sample', monthlyIncome: 160000, monthlyObligations: 20000, salaryMonths: 16, cashflowStability: 70, relationshipYears: 3, bureauScore: 710, holdout: true, accountMasked: '****5050', blurb: 'Held out of campaigns so uplift can be measured.', branchId: 'khi-clifton' },
  { key: 'imran', fullName: 'Imran Farooqi', nameUr: 'عمران فاروقی', email: 'imran.farooqi@customer.demo', cnic: '7841990123456', phone: '03015550999', dob: '1987-12-01', city: 'Karachi', segment: 'expat', residency: 'resident', employmentType: 'salaried', employer: 'Gulf Logistics', monthlyIncome: 180000, monthlyObligations: 20000, salaryMonths: 18, cashflowStability: 75, relationshipYears: 2, bureauScore: 690, accountMasked: '****7711', blurb: 'Overseas Pakistani salary credits, eligible for retail products.', branchId: 'khi-clifton' },
  { key: 'usman', fullName: 'Usman Raza', nameUr: 'عثمان رضا', email: 'usman.raza@customer.demo', cnic: '4210166612340', phone: '03016661234', dob: '1992-05-22', city: 'Karachi', segment: 'salaried', employmentType: 'salaried', employer: 'Port Authority', monthlyIncome: 210000, monthlyObligations: 25000, salaryMonths: 16, cashflowStability: 82, relationshipYears: 4, bureauScore: 735, accountMasked: '****8181', blurb: 'Auto Ijarah waiting on Shariah evidence.', branchId: 'khi-clifton' },
  { key: 'hiba', fullName: 'Hiba Merchant', nameUr: 'ہبہ مرچنٹ', email: 'hiba.merchant@customer.demo', cnic: '4210144455567', phone: '03014445556', dob: '1995-07-19', city: 'Karachi', segment: 'salaried', employmentType: 'salaried', employer: 'Studio North', monthlyIncome: 150000, monthlyObligations: 12000, salaryMonths: 11, cashflowStability: 70, relationshipYears: 1, bureauScore: 705, accountMasked: '****4242', blurb: 'Walk-in available at the dealer counter.', branchId: 'khi-clifton' },
];

const staff = [
  ['Zara Qureshi', 'zara.qureshi@noorhorizon.demo', 'relationship_manager', 'khi-clifton', 500000],
  ['Omar Siddiqui', 'omar.siddiqui@noorhorizon.demo', 'underwriter', 'khi-clifton', 2000000],
  ['Sadia Rahman', 'sadia.rahman@noorhorizon.demo', 'credit_officer', 'khi-clifton', 5000000],
  ['Hina Baig', 'hina.baig@noorhorizon.demo', 'credit_committee', 'khi-clifton', 0],
  ['Kamran Ali', 'kamran.ali@noorhorizon.demo', 'credit_committee', 'khi-clifton', 0],
  ['Farah Naveed', 'farah.naveed@noorhorizon.demo', 'operations', 'khi-clifton', 0],
  ['Idrees Qadri', 'idrees.qadri@noorhorizon.demo', 'shariah_advisor', 'khi-clifton', 0],
  ['Meher Khan', 'meher.khan@noorhorizon.demo', 'marketing', 'khi-clifton', 0],
  ['Tariq Jameel', 'tariq.jameel@noorhorizon.demo', 'credit_policy', 'khi-clifton', 0],
  ['Hira Latif', 'hira.latif@noorhorizon.demo', 'model_risk', 'khi-clifton', 0],
  ['Rabia Noor', 'rabia.noor@noorhorizon.demo', 'compliance', 'khi-clifton', 0],
  ['Imtiaz Shah', 'imtiaz.shah@noorhorizon.demo', 'auditor', 'khi-clifton', 0],
  ['Noman Dealer', 'noman.dealer@noorhorizon.demo', 'dealer', 'khi-clifton', 3000000],
  ['HBL Admin', 'admin@noorhorizon.demo', 'system_admin', 'khi-clifton', 0],
];

async function openCase({ customer, product, amount, tenor, channel = 'app', hoursAgo = 1, asset, dealerId = '' }) {
  const policy = await loadPolicy({
    jurisdiction: customer.jurisdiction,
    tenantId: TENANT,
    segment: customer.segment,
    productCode: product.code,
    channel,
    entityId: customer.branchId,
  });
  const application = await Application.create({
    tenantId: TENANT,
    reference: `APP-${new Date().getFullYear()}-${String((await Counter.findOneAndUpdate({ _id: 'application' }, { $inc: { seq: 1 } }, { upsert: true, new: true })).seq).padStart(8, '0')}`,
    customerId: customer._id,
    productCode: product.code,
    channel,
    branchId: customer.branchId,
    dealerId,
    jurisdiction: customer.jurisdiction,
    contractType: product.contractType,
    currency: product.currency,
    amount,
    tenorMonths: tenor,
    indicativeRate: product.baseRate,
    indicativeInstalment: quotePayment(product, amount, product.baseRate, tenor),
    status: 'verified',
    kycStatus: 'verified',
    submittedAt: new Date(Date.now() - hoursAgo * 3600 * 1000),
    screening: { sanctions: false, pep: Boolean(customer.pepFlag), adverseMedia: false, provider: 'screening-simulator' },
    bureau: { score: customer.bureauScore || 0, worstDpd: 0, writeOff: false, source: customer.jurisdiction === 'KSA' ? 'simah' : 'ecib', pulledAt: new Date() },
    incomeVerified: true,
    incomeSource: product.affordabilityMode === 'cashflow' ? 'cashflow' : 'salary_credits',
    sequence: sequenceFor(product.contractType, policy['islamic.sequences']?.value),
    asset,
  });
  await decideApplication({ application, customer, actor: { id: 'seed', name: 'Decision engine', role: 'system' } });
  return application;
}

async function seed() {
  await connectDb();
  await Promise.all([
    User.deleteMany({}), Customer.deleteMany({}), Consent.deleteMany({}), Product.deleteMany({}),
    ConfigEntry.deleteMany({}), Scorecard.deleteMany({}), Rule.deleteMany({}), Application.deleteMany({}),
    DecisionRecord.deleteMany({}), Counter.deleteMany({}), Offer.deleteMany({}), Campaign.deleteMany({}),
    LoanAccount.deleteMany({}), ServicingRequest.deleteMany({}), AuditLog.deleteMany({}), Scheme.deleteMany({}),
    Dealer.deleteMany({}), EarlyWarning.deleteMany({}), ModelCard.deleteMany({}), AdapterRun.deleteMany({}),
    DocumentTemplate.deleteMany({}),
  ]);

  await Product.create(products);
  await Scorecard.create(scorecards);
  await ConfigEntry.create([
    config('regulatory.dbr', 'system', {}, { maxDbr: 0.5, minAge: 18, maxAge: 70, maxDpd: 90, allowNonResident: false, offerValidityDays: 14, minCashflowCover: 1.3, referBuffer: 0.05, referBufferCover: 0.2, groupExposureCap: 50000000, illustrative: true }),
    config('regulatory.dbr', 'jurisdiction', { jurisdiction: 'PK' }, { maxDbr: 0.4, minAge: 21, maxAge: 60, maxAgeAtMaturity: 65, offerValidityDays: 7, authority: 'SBP', packName: 'Pakistan consumer pack', illustrative: true, minCashflowCover: 1.25 }),
    config('regulatory.dbr', 'jurisdiction', { jurisdiction: 'KSA' }, { maxDbr: 0.33, minAge: 21, maxAge: 60, offerValidityDays: 5, authority: 'SAMA', packName: 'Saudi responsible lending pack', allowNonResident: true, illustrative: true }),
    config('regulatory.dbr', 'jurisdiction', { jurisdiction: 'UAE' }, { maxDbr: 0.5, minAge: 21, maxAge: 65, offerValidityDays: 5, authority: 'CBUAE', packName: 'UAE consumer pack', illustrative: true }),
    config('regulatory.dbr', 'tenant', { tenantId: TENANT }, { packName: 'HBL overlay' }),
    config('regulatory.dbr', 'product', { productCode: HBL_CODES.HL }, { maxDbr: 0.5 }),
    config('regulatory.dbr', 'product', { productCode: HBL_CODES.HD }, { maxDbr: 0.5 }),
    config('regulatory.dbr', 'product', { productCode: HBL_CODES.SW }, { minCashflowCover: 1.25 }),
    config('regulatory.dbr', 'product', { productCode: HBL_CODES.SM }, { minCashflowCover: 1.25 }),
    config('pricing.bands', 'system', {}, { floorRate: 0.08, capRate: 0.28, relationshipYears: 3, relationshipDiscount: 0.005, grades: [{ minScore: 80, premium: 0, label: 'A' }, { minScore: 72, premium: 0.005, label: 'B' }, { minScore: 55, premium: 0.015, label: 'C' }, { minScore: 0, premium: 0.03, label: 'D' }] }),
    config('doa.matrix', 'system', {}, { stpLimit: 1500000, officerLimit: 5000000, committeeAbove: 5000000, fourEyesAbove: 1000000, slaHours: 4, groupExposureCap: 25000000 }),
    config('fraud.thresholds', 'system', {}, { duplicateRefer: 2, duplicateDecline: 4, deviceReferScore: 70, pepOutcome: 'refer' }),
    config('islamic.sequences', 'system', {}, SEQUENCES),
    config('engagement.frequency', 'system', {}, { maxContactsPer7Days: 2, maxContactsPer30Days: 4, quietHours: [22, 8] }),
    config('bank.profile', 'tenant', { tenantId: TENANT }, { name: 'Habib Bank Limited', shortName: 'HBL', city: 'Karachi', demo: true }),
  ]);
  await Rule.create([
    { code: 'R-EL-06', name: 'Minimum verified income', stage: 'eligibility', priority: 15, appliesTo: { products: [HBL_CODES.PL, HBL_CODES.IPF], segments: ['*'], jurisdictions: ['PK'] }, when: { all: [{ field: 'monthlyIncome', op: 'lt', value: 40000 }] }, then: { outcome: 'decline', reasonCode: 'ELIG_INCOME', stop: true }, enabled: true, status: 'active', version: 1, makerName: 'Credit policy', checkerName: 'Compliance' },
    { code: 'DEALER_HIGH_TICKET', name: 'Dealer tickets above 2 million are reviewed', stage: 'policy', priority: 20, appliesTo: { products: [HBL_CODES.AL, HBL_CODES.AI], segments: ['*'], jurisdictions: ['PK'] }, when: { all: [{ field: 'channel', op: 'eq', value: 'dealer' }, { field: 'requestedAmount', op: 'gt', value: 2000000 }] }, then: { outcome: 'refer', reasonCode: 'DOA_ABOVE_STP', stop: false }, enabled: true, status: 'active', version: 1, makerName: 'Credit policy', checkerName: 'Compliance' },
  ]);

  const passwordHash = await hashPassword(PASSWORD);
  const customers = {};
  for (const person of people) {
    const customer = await Customer.create({
      tenantId: TENANT,
      customerNo: `HBL-${person.key.toUpperCase()}`,
      fullName: person.fullName,
      nameUr: person.nameUr,
      cnicEncrypted: encryptField(person.cnic),
      cnicLast4: last4(person.cnic),
      phoneEncrypted: encryptField(person.phone),
      phoneLast4: last4(person.phone),
      email: person.email,
      dateOfBirth: new Date(person.dob),
      age: ageFromDob(person.dob),
      city: person.city,
      segment: person.segment,
      residency: person.residency || 'resident',
      employmentType: person.employmentType,
      employer: person.employer,
      monthlyIncome: person.monthlyIncome || 0,
      monthlyObligations: person.monthlyObligations || 0,
      salaryMonths: person.salaryMonths || 0,
      cashflowMonthly: person.cashflowMonthly || person.monthlyIncome || 0,
      cashflowStability: person.cashflowStability || 50,
      altDataQuality: person.altDataQuality || 0,
      relationshipYears: person.relationshipYears || 0,
      existingExposure: person.existingExposure || 0,
      bureauScore: person.bureauScore || 0,
      kycStatus: 'verified',
      jurisdiction: person.jurisdiction || 'PK',
      branchId: person.branchId,
      accountMasked: person.accountMasked,
      lifeEvents: person.lifeEvents || [],
      salaryStopped: Boolean(person.salaryStopped),
      pepFlag: Boolean(person.pepFlag),
      holdout: Boolean(person.holdout),
      onTimePayments: person.onTimePayments || 0,
      blurb: person.blurb,
      preferredChannel: 'app',
    });
    const user = await User.create({
      email: person.email,
      passwordHash,
      name: person.fullName,
      role: 'customer',
      tenantId: TENANT,
      branchId: person.branchId,
      customerId: customer._id,
      demoPersona: true,
      status: 'active',
    });
    customer.userId = user._id;
    await customer.save();
    customers[person.key] = customer;
  }

  for (const [name, email, role, branchId, doaLimit] of staff) {
    await User.create({
      email, passwordHash, name, role, tenantId: TENANT, branchId, doaLimit,
      dealerId: role === 'dealer' ? 'CLIFTON' : '',
      skills: role === 'underwriter' ? ['personal', 'auto'] : [],
      status: 'active',
    });
  }

  const byCode = Object.fromEntries((await Product.find().lean()).map((product) => [product.code, product]));
  const ayeshaLoanApp = await openCase({ customer: customers.ayesha, product: byCode[HBL_CODES.PL], amount: 250000, tenor: 12, hoursAgo: 24 * 200 });
  const schedule = buildSchedule(250000, ayeshaLoanApp.indicativeRate, 12, ayeshaLoanApp.indicativeInstalment);
  const loan = await LoanAccount.create({
    tenantId: TENANT,
    applicationId: ayeshaLoanApp._id,
    customerId: customers.ayesha._id,
    productCode: HBL_CODES.PL,
    contractType: 'conventional',
    principal: 250000,
    rate: ayeshaLoanApp.indicativeRate,
    tenorMonths: 12,
    instalment: ayeshaLoanApp.indicativeInstalment,
    disbursedAt: new Date(Date.now() - 180 * 24 * 3600 * 1000),
    accountMasked: customers.ayesha.accountMasked,
    schedule: schedule.map((row, index) => ({ ...row, status: index < 6 ? 'paid' : 'due' })),
    paidCount: 6,
  });
  ayeshaLoanApp.status = 'disbursed';
  ayeshaLoanApp.loanId = loan._id;
  ayeshaLoanApp.disbursedAt = loan.disbursedAt;
  await ayeshaLoanApp.save();

  await openCase({ customer: customers.farooq, product: byCode[HBL_CODES.PL], amount: 1200000, tenor: 36, hoursAgo: 6 });
  await openCase({ customer: customers.nida, product: byCode[HBL_CODES.PL], amount: 600000, tenor: 24, hoursAgo: 3 });
  const hamza = await openCase({ customer: customers.hamza, product: byCode[HBL_CODES.SW], amount: 6000000, tenor: 12, channel: 'assisted', hoursAgo: 5 });
  hamza.votes.push({ by: 'Sadia Rahman', role: 'credit_officer', vote: 'approve', comment: 'Cash flow is close to the cover test. I support it with a stock report.', at: new Date() });
  hamza.schemeCode = 'SME_GUARANTEE';
  await hamza.save();
  await openCase({ customer: customers.adeel, product: byCode[HBL_CODES.PL], amount: 500000, tenor: 24, hoursAgo: 1 });
  const usman = await openCase({ customer: customers.usman, product: byCode[HBL_CODES.AI], amount: 900000, tenor: 36, channel: 'dealer', dealerId: 'CLIFTON', hoursAgo: 8, asset: { description: '2024 Toyota Yaris', value: 4500000 } });
  if (usman.status === 'approved') {
    usman.status = 'pending_fulfilment';
    await usman.save();
  }

  const validUntil = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  await Offer.create([
    { tenantId: TENANT, customerId: customers.ayesha._id, productCode: HBL_CODES.PL, limit: 1500000, tenorMonths: 36, propensity: 86, channel: 'app', message: 'You are pre-approved for an HBL Personal Loan.', validUntil },
    { tenantId: TENANT, customerId: customers.ayesha._id, productCode: HBL_CODES.AI, limit: 3000000, tenorMonths: 36, propensity: 71, channel: 'app', message: 'Islamic Auto Ijarah is open if you are choosing a car.', validUntil },
    { tenantId: TENANT, customerId: customers.sana._id, productCode: HBL_CODES.IPF, limit: 400000, tenorMonths: 24, propensity: 64, channel: 'app', message: 'Islamic personal finance is open up to this limit.', validUntil },
  ]);
  await Campaign.create({ tenantId: TENANT, name: 'Salary-day personal loan', segment: 'salaried', channel: 'app', productCode: HBL_CODES.PL, message: 'Your salary just landed. A personal loan limit is ready if you want it.', discountRate: 0, status: 'active', frequencyCap: 2, holdoutPercent: 10 });
  await Scheme.create([
    { code: 'SME_GUARANTEE', name: 'SME guarantee scheme', authority: 'Illustrative SBP-style scheme', jurisdiction: 'PK', productCodes: [HBL_CODES.SW, HBL_CODES.SM], coveragePercent: 60, maxAmount: 10000000, eligibilityNote: 'Trading SMEs with verified turnover and DSCR at or above 1.25.', reportingCode: 'SME-G-01', illustrative: true },
    { code: 'HOUSING_SUPPORT', name: 'Housing support scheme', authority: 'Illustrative housing scheme', jurisdiction: 'PK', productCodes: [HBL_CODES.HL, HBL_CODES.HD], coveragePercent: 0, maxAmount: 15000000, eligibilityNote: 'First home, within the configured price cap.', reportingCode: 'HSG-01', illustrative: true },
  ]);
  await Dealer.create({ code: 'CLIFTON', name: 'Clifton Motors', city: 'Karachi', category: 'auto', settlementAccount: '****9090' });
  await EarlyWarning.create({ tenantId: TENANT, customerId: customers.bilal._id, code: 'SALARY_STOP', severity: 'high', title: 'Salary credits have stopped', detail: 'No salary credit in the last cycle. Do not offer new credit.', recommendedAction: 'Soft contact and a restructure conversation. No new limit.', status: 'open' });
  await ModelCard.create([
    { code: 'SC-RET-UNS', name: 'Retail unsecured scorecard', purpose: 'Illustrative application score for personal loans. Cut-offs in the BRD are 640 approve and 560 refer on a 300-900 scale; this demo keeps a 0-100 weighted card until Model Risk replaces it.', owner: 'Data science', status: 'champion', dataUsed: ['Bureau', 'Salary continuity', 'Affordability headroom', 'Relationship'], limits: 'Retail unsecured only. Not for SME obligor rating.', metrics: { gini: 0.41, ks: 0.32, psi: 0.06, overrideRate: 0.08 }, fairness: 'Approval gap across gender proxy and city is inside the 5 point monitoring band on the last sample.', validator: 'Independent model risk', validatedAt: new Date(), monitoring: 'Monthly PSI, Gini/KS and override review.' },
    { code: 'SC-RET-UNS-CHALLENGER', name: 'Retail unsecured challenger', purpose: 'Shadow model. Not used for decisions.', owner: 'Data science', status: 'challenger', dataUsed: ['Champion features', 'Utility payment regularity'], limits: 'Shadow mode only.', metrics: { gini: 0.44, ks: 0.34, psi: 0.11, overrideRate: 0 }, fairness: 'Under review.', validator: 'Pending', monitoring: 'Shadow decisions stored beside the champion.' },
  ]);
  await DocumentTemplate.create([
    { code: 'kfs-pk', name: 'Key facts statement', jurisdiction: 'PK', kind: 'disclosure', body: 'Amount, tenor, instalment, total cost, fees and cooling-off.' },
    { code: 'ijarah-lease', name: 'Ijarah lease', jurisdiction: 'PK', kind: 'islamic', body: 'Lease starts only after ownership and possession are evidenced.' },
  ]);
  await AuditLog.create({ tenantId: TENANT, actorName: 'Seed', actorRole: 'system', action: 'seed', resource: 'platform', detail: { note: 'Demo tenant Habib Bank Limited' } });

  console.log('Seeded HBL LOS');
  console.log('Customer demo entry is on the welcome screen. Staff password: Los@Demo2026');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
