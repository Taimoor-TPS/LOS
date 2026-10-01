import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocatePayment,
  annualPercentageRate,
  bookedProvision,
  classifyConsumer,
  decisionOutcome,
  eligibilityResult,
  identityFromId,
  ifrsStage,
  pmt,
  trialBalance,
} from './platformEngine.js';
import { accountingView, approveApplication, approveDeviation, resetPlatformState } from '../modules/platform/store.js';

test('reducing-balance instalment matches the standard formula', () => {
  assert.equal(pmt(0.12, 12, 100000), 8885);
});

test('consumer classification follows the seeded DPD bands', () => {
  assert.equal(classifyConsumer(0).category, 'Regular');
  assert.equal(classifyConsumer(89).bucket, '60+');
  assert.equal(classifyConsumer(90).category, 'Substandard');
  assert.equal(classifyConsumer(180).category, 'Doubtful');
  assert.equal(classifyConsumer(365).category, 'Loss');
  assert.equal(classifyConsumer(90).provisionRate, 0.25);
});

test('IFRS 9 stage uses the 60 and 90 day backstops', () => {
  assert.equal(ifrsStage(10), 1);
  assert.equal(ifrsStage(60), 2);
  assert.equal(ifrsStage(20, { restructured: true }), 2);
  assert.equal(ifrsStage(90), 3);
});

test('stage 3 provision is the higher of ECL and the prudential rate', () => {
  assert.equal(bookedProvision({ stage: 3, ecl: 1000, regulatory: 2500 }), 2500);
  assert.equal(bookedProvision({ stage: 1, ecl: 400, regulatory: 0 }), 400);
});

test('performing allocation takes fees, then profit, then principal', () => {
  const loan = {
    regulatoryClassification: 'Regular',
    islamic: false,
    feesDue: 100,
    lateChargesDue: 0,
    interestDue: 200,
    interestOverdue: 0,
    principalDue: 300,
    principalOverdue: 0,
    principalOutstanding: 1000,
    excessPayment: 0,
  };
  const applied = allocatePayment(loan, 700);
  assert.deepEqual(applied, { fees: 100, interest: 200, principal: 400, charity: 0, excess: 0 });
  assert.equal(loan.principalOutstanding, 600);
});

test('Islamic late charges are not booked as income', () => {
  const loan = {
    regulatoryClassification: 'Regular',
    islamic: true,
    feesDue: 0,
    lateChargesDue: 50,
    interestDue: 0,
    interestOverdue: 0,
    principalDue: 0,
    principalOverdue: 0,
    principalOutstanding: 0,
    excessPayment: 0,
  };
  const applied = allocatePayment(loan, 50);
  assert.equal(applied.charity, 50);
  assert.equal(applied.fees, 0);
});

test('identity tails drive the demo decision paths', () => {
  assert.equal(identityFromId('35202-0000000-1').bureau, 'clear');
  assert.equal(identityFromId('352020000000002').flag, 'WRITE_OFF_HIT');
  assert.equal(identityFromId('0003').flag, 'SANCTIONS_POTENTIAL');
  assert.equal(identityFromId('42101-0000000-4').cardStatus, 'EXPIRED');
});

test('write-off hit is a hard stop with a neutral customer message', () => {
  const result = eligibilityResult({ writeOffHit: true, netMonthlyIncome: 200000, age: 34, requestedAmount: 100000, tenorMonths: 12, annualRate: 0.2 });
  assert.equal(result.eligible, false);
  assert.match(result.reasons[0], /unable to offer/i);
});

test('decision matrix auto-approves a clean A-band case and declines band E', () => {
  assert.equal(decisionOutcome({ knockOut: false, bureau: 'clear', dbrWithinCap: true, band: 'A', deviations: false }).outcome, 'AUTO_APPROVE');
  assert.equal(decisionOutcome({ knockOut: false, bureau: 'clear', dbrWithinCap: true, band: 'E', deviations: false }).outcome, 'AUTO_DECLINE');
});

test('APR is finite for a fee-deducted disbursement', () => {
  const apr = annualPercentageRate({ netDisbursed: 99000, instalment: 8885, tenorMonths: 12 });
  assert.ok(apr > 12 && apr < 20);
});

test('seeded trial balance debits equal credits', () => {
  resetPlatformState();
  const view = accountingView();
  assert.equal(view.trialBalance.balanced, true);
  assert.equal(view.trialBalance.debit, view.trialBalance.credit);
  assert.ok(view.trialBalance.debit > 0);
});

test('approval is blocked while a policy deviation is open', () => {
  resetPlatformState();
  assert.throws(() => approveApplication('PKPFS261001000123'), /blocked/);
  approveDeviation('DEV-001', 'Salary slip supports a higher net income.');
  assert.deepEqual(approveApplication('PKPFS261001000123'), { applicationNo: 'PKPFS261001000123', outcome: 'APPROVED' });
});

test('trial balance helper rejects an unbalanced set', () => {
  const tb = trialBalance([{ lines: [{ gl: '1310', dr: 10, cr: 0 }, { gl: '1250', dr: 0, cr: 4 }] }]);
  assert.equal(tb.balanced, false);
});
