import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateApplication } from './decisionEngine.js';
import { instalment, processingFee, quotePayment } from './money.js';

const bands = {
  bureau: [
    { min: 720, points: 100 },
    { min: 680, points: 85 },
    { min: 640, points: 70 },
    { min: 600, points: 55 },
    { min: 0, points: 20 },
  ],
  capacity: [
    { min: 80, points: 100 },
    { min: 65, points: 80 },
    { min: 50, points: 60 },
    { min: 0, points: 20 },
  ],
  salary: [
    { min: 12, points: 100 },
    { min: 6, points: 70 },
    { min: 3, points: 45 },
    { min: 0, points: 15 },
  ],
  years: [
    { min: 3, points: 100 },
    { min: 1, points: 60 },
    { min: 0, points: 25 },
  ],
  stability: [
    { min: 75, points: 90 },
    { min: 60, points: 70 },
    { min: 40, points: 50 },
    { min: 0, points: 20 },
  ],
};

const salariedCard = {
  code: 'SC_SALARIED',
  version: 1,
  approveCutoff: 72,
  referCutoff: 55,
  factors: [
    { key: 'bureauScore', label: 'Bureau', weight: 30, bands: bands.bureau },
    { key: 'capacityScore', label: 'Capacity', weight: 25, bands: bands.capacity },
    { key: 'salaryMonths', label: 'Salary continuity', weight: 20, bands: bands.salary },
    { key: 'relationshipYears', label: 'Relationship', weight: 15, bands: bands.years },
    { key: 'cashflowStability', label: 'Stability', weight: 10, bands: bands.stability },
  ],
};

const product = {
  code: 'PF_CONV',
  baseRate: 0.15,
  minRate: 0.12,
  maxRate: 0.22,
  feeRate: 0.01,
  minAmount: 50000,
  maxAmount: 1500000,
  minTenor: 6,
  maxTenor: 60,
  employment: ['salaried'],
  lgd: 0.45,
  affordabilityMode: 'dbr',
};

const regulatory = { maxDbr: 0.4, minAge: 21, maxAge: 65, maxDpd: 90, allowNonResident: false, offerValidityDays: 7 };
const doa = { stpLimit: 1500000, committeeAbove: 5000000, groupExposureCap: 25000000 };
const pricing = { floorRate: 0.12, capRate: 0.22, relationshipYears: 3, relationshipDiscount: 0.005 };

function decide(overrides) {
  const features = {
    age: 32,
    segment: 'salaried',
    residency: 'resident',
    employmentType: 'salaried',
    kycStatus: 'verified',
    salaryMonths: 14,
    monthlyIncome: 185000,
    monthlyObligations: 35000,
    requestedAmount: 800000,
    tenorMonths: 36,
    instalment: instalment(800000, 0.15, 36),
    bureauScore: 742,
    bureauDelinquency: 0,
    writeOff: false,
    relationshipYears: 4,
    existingExposure: 0,
    cashflowStability: 78,
    sanctionsHit: false,
    pep: false,
    salaryStopped: false,
    duplicateApplications: 0,
    deviceRiskScore: 10,
    productCode: 'PF_CONV',
    jurisdiction: 'PK',
    ...overrides,
  };
  return evaluateApplication({ features, product, scorecard: salariedCard, regulatory, pricing, doa, rules: [] });
}

test('Ayesha salaried personal finance is a straight-through approval', () => {
  const result = decide();
  assert.equal(result.outcome, 'approve');
  assert.equal(result.mode, 'stp');
  assert.ok(result.pricing.instalment > 27000 && result.pricing.instalment < 29000);
  assert.ok(result.score.score >= 72);
  assert.equal(result.affordability.pass, true);
});

test('thin affordability declines with a customer reason', () => {
  const result = decide({ monthlyIncome: 100000, monthlyObligations: 48000, requestedAmount: 600000, instalment: instalment(600000, 0.15, 24), tenorMonths: 24 });
  assert.equal(result.outcome, 'decline');
  assert.ok(result.reasons.some((reason) => reason.code === 'DBR_CAP'));
});

test('mid score with room in the DBR is referred', () => {
  const result = decide({
    monthlyIncome: 200000,
    monthlyObligations: 20000,
    requestedAmount: 1200000,
    tenorMonths: 36,
    instalment: instalment(1200000, 0.15, 36),
    bureauScore: 630,
    salaryMonths: 7,
    relationshipYears: 1,
    cashflowStability: 45,
  });
  assert.equal(result.outcome, 'refer');
  assert.equal(result.affordability.pass, true);
});

test('sanctions is a hard decline even with a strong score', () => {
  const result = decide({ sanctionsHit: true });
  assert.equal(result.outcome, 'decline');
  assert.ok(result.reasons.some((reason) => reason.code === 'FRAUD_SANCTIONS'));
});

test('amount above the committee threshold is not straight-through', () => {
  const result = evaluateApplication({
    features: {
      age: 41,
      segment: 'sme',
      residency: 'resident',
      employmentType: 'self_employed',
      kycStatus: 'verified',
      salaryMonths: 24,
      monthlyIncome: 420000,
      monthlyObligations: 0,
      requestedAmount: 6000000,
      tenorMonths: 24,
      instalment: instalment(6000000, 0.18, 24),
      bureauScore: 700,
      bureauDelinquency: 0,
      writeOff: false,
      relationshipYears: 5,
      existingExposure: 0,
      cashflowStability: 80,
      sanctionsHit: false,
      pep: false,
      salaryStopped: false,
      duplicateApplications: 0,
      deviceRiskScore: 5,
      productCode: 'SME_WC',
      jurisdiction: 'PK',
    },
    product: { ...product, code: 'SME_WC', maxAmount: 15000000, minAmount: 500000, baseRate: 0.18, affordabilityMode: 'cashflow', employment: ['self_employed'] },
    scorecard: salariedCard,
    regulatory: { ...regulatory, minCashflowCover: 1.25 },
    pricing,
    doa,
    rules: [],
  });
  assert.equal(result.outcome, 'committee');
});

test('Murabaha flat profit matches the BRD worked example', () => {
  const product = { contractType: 'murabaha', feeRate: 0.01, feeMin: 2500, feeMax: 25000 };
  assert.equal(quotePayment(product, 800000, 0.09, 36), 28222);
  assert.equal(processingFee(3000000, product), 25000);
  assert.equal(processingFee(250000, product), 2500);
});

test('reducing-balance instalment stays in the BRD worked band', () => {
  const emi = instalment(800000, 0.15, 36);
  assert.ok(emi >= 27700 && emi <= 27800);
});
