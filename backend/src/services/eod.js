import { Entity, EodRun, ClassificationRegime, CollectionCase, PTP, LoanTransaction, ReconBreak, TBSnapshot } from '../models/platformModels.js';
import { LoanAccount } from '../modules/servicing/model/LoanAccount.js';
import { addDays, daysBetween, isMonthEnd } from './common.js';
import { postEvent, glBalance, trialBalanceView } from './accounting.js';
import {
  bucketForDpd, classifyConsumer, ifrsStage, expectedCreditLoss, regulatoryProvision, bookedProvision, collectionStrategy,
} from '../engine/platformEngine.js';
import { httpError } from '../security/http.js';
import { notify } from './notify.js';
import { Customer } from '../modules/customers/model/Customer.js';

async function step(run, name, fn) {
  const row = { name, status: 'RUNNING', startedAt: new Date() };
  run.steps.push(row);
  try {
    await fn();
    row.status = 'COMPLETE';
  } catch (err) {
    row.status = 'FAILED';
    row.error = err.message;
    throw err;
  } finally {
    row.endedAt = new Date();
  }
}

function unpaidDue(loan, businessDate) {
  const lines = (loan.schedule || []).filter((line) => line.status !== 'PAID' && line.dueDate && line.dueDate <= businessDate);
  if (!lines.length) return null;
  return lines.map((line) => line.dueDate).sort()[0];
}

export async function reconcile(businessDate) {
  const loans = await LoanAccount.find({ status: { $in: ['ACTIVE', 'CLOSED'] } }).lean();
  const principal = loans.filter((loan) => loan.status === 'ACTIVE').reduce((sum, loan) => sum + Number(loan.principalOutstanding || 0), 0);
  const glPrincipal = await glBalance('1310');
  const clearing = await glBalance('1990');
  const memo = await glBalance('9100');
  const suspended = loans.reduce((sum, loan) => sum + Number(loan.interestSuspended || 0), 0);
  const reserve = -1 * (await glBalance('1390'));
  const booked = loans.reduce((sum, loan) => sum + Number(loan.bookedProvision || 0), 0);
  const tb = await trialBalanceView();
  const checks = [
    { code: 'TB-01', passed: tb.balanced, expected: tb.debit, actual: tb.credit, detail: 'Trial balance debits equal credits' },
    { code: 'TB-02', passed: principal === glPrincipal, expected: principal, actual: glPrincipal, detail: 'Loan sub-ledger versus control GL 1310' },
    { code: 'TB-03', passed: suspended === memo, expected: suspended, actual: memo, detail: 'Memo interest versus memo ledger 9100' },
    { code: 'TB-04', passed: booked === reserve, expected: booked, actual: reserve, detail: 'Provision reserve versus loan ledger' },
    { code: 'TB-06', passed: clearing === 0, expected: 0, actual: clearing, detail: 'Clearing GL is zero' },
  ];
  await ReconBreak.deleteMany({ businessDate });
  await ReconBreak.create(checks.map((row) => ({ businessDate, ...row, accepted: row.passed })));
  await TBSnapshot.create({ businessDate, trialBalance: tb, checks });
  return { checks, trialBalance: tb };
}

export async function runEod({ actorId } = {}) {
  const entity = await Entity.findOne({ code: 'PK-01' });
  if (!entity) throw httpError(500, 'Entity PK-01 is not configured');
  const businessDate = entity.businessDate;
  const already = await EodRun.findOne({ date: businessDate, status: 'COMPLETE' }).lean();
  if (already) return { run: already, businessDate, skipped: true };
  const regime = await ClassificationRegime.findOne({ code: 'PK-CONSUMER', status: 'ACTIVE' }).lean();
  const run = await EodRun.create({ date: businessDate, status: 'RUNNING', steps: [], startedAt: new Date() });
  try {
    await step(run, 'mark-dues', async () => {
      const loans = await LoanAccount.find({ status: 'ACTIVE' });
      for (const loan of loans) {
        let changed = false;
        loan.schedule = (loan.schedule || []).map((line) => {
          if (line.status === 'PAID' || line.billed) return line;
          if (line.dueDate && line.dueDate <= businessDate) {
            loan.principalDue = Number(loan.principalDue || 0) + Number(line.principal || 0);
            loan.interestDue = Number(loan.interestDue || 0) + Number(line.interest || line.profit || 0);
            changed = true;
            return { ...line, status: 'DUE', billed: true };
          }
          return line;
        });
        if (changed) loan.markModified('schedule');
        await loan.save();
      }
    });
    await step(run, 'accrue', async () => {
      const loans = await LoanAccount.find({ status: 'ACTIVE' });
      for (const loan of loans) {
        const daily = Math.round(Number(loan.principalOutstanding || 0) * Number(loan.rate || 0) / 365);
        if (!daily) continue;
        const suspended = loan.regulatoryClassification && loan.regulatoryClassification !== 'Regular';
        const ctx = {
          interest: daily, productCode: loan.productCode, currency: loan.currency, branchId: loan.branchId,
          entityId: loan.entityId, valueDate: businessDate, businessDate, actorId,
        };
        if (suspended) {
          loan.interestSuspended = Number(loan.interestSuspended || 0) + daily;
          await postEvent('E12', ctx, { narration: `Memo accrual ${loan.loanAccountNo}` });
        } else {
          loan.interestAccrued = Number(loan.interestAccrued || 0) + daily;
          await postEvent('E4', ctx, { narration: `Accrual ${loan.loanAccountNo}` });
        }
        await loan.save();
      }
    });
    await step(run, 'dpd-classification', async () => {
      const loans = await LoanAccount.find({ status: 'ACTIVE' });
      for (const loan of loans) {
        const due = unpaidDue(loan, businessDate);
        const dpd = due ? Math.max(0, daysBetween(due, addDays(businessDate, 1))) : 0;
        loan.dpd = dpd;
        loan.maxDpd = Math.max(Number(loan.maxDpd || 0), dpd);
        const band = (regime?.bands || []).find((row) => dpd >= row.from && dpd <= row.to) || classifyConsumer(dpd);
        loan.bucket = band.bucket || bucketForDpd(dpd);
        loan.regulatoryClassification = band.category || band.name || classifyConsumer(dpd).category;
        loan.ifrs9Stage = ifrsStage(dpd, { restructured: loan.restructured });
        const grace = 3;
        if (dpd > grace && !loan.lateChargeApplied) {
          const charge = Math.round(Number(loan.instalment || 0) * 0.02);
          loan.lateChargesDue = Number(loan.lateChargesDue || 0) + charge;
          loan.lateChargeApplied = true;
          if (charge) {
            await postEvent('E5', {
              charges: charge, productCode: loan.productCode, currency: loan.currency, branchId: loan.branchId,
              entityId: loan.entityId, valueDate: businessDate, businessDate,
            }, { narration: `Late charge ${loan.loanAccountNo}` });
          }
        }
        if (isMonthEnd(businessDate)) {
          const ead = Number(loan.principalOutstanding || 0);
          const stage = loan.ifrs9Stage;
          const ecl = expectedCreditLoss({ stage, ead, secured: false });
          const rate = band.provisionRate ?? classifyConsumer(dpd).provisionRate;
          const regulatory = regulatoryProvision(ead, rate);
          const booked = bookedProvision({ stage, ecl, regulatory });
          const delta = booked - Number(loan.bookedProvision || 0);
          const ctx = {
            provisionDelta: Math.abs(delta), productCode: loan.productCode, currency: loan.currency,
            branchId: loan.branchId, entityId: loan.entityId, valueDate: businessDate, businessDate,
          };
          if (delta > 0) await postEvent('E14', ctx, { narration: `Provision ${loan.loanAccountNo}` });
          if (delta < 0) await postEvent('E15', ctx, { narration: `Provision release ${loan.loanAccountNo}` });
          loan.eclAmount = ecl;
          loan.regulatoryProvision = regulatory;
          loan.bookedProvision = booked;
        }
        await loan.save();
        if (dpd >= 1) {
          const strategy = collectionStrategy(loan);
          await CollectionCase.findOneAndUpdate(
            { loanId: loan._id, status: 'OPEN' },
            { $set: { customerId: loan.customerId, dpd, bucket: loan.bucket, strategy: strategy.stage, queue: strategy.queue } },
            { upsert: true, new: true },
          );
        }
      }
    });
    await step(run, 'ptp', async () => {
      const open = await PTP.find({ status: 'OPEN', promiseDate: { $lte: businessDate } });
      for (const ptp of open) {
        const paid = await LoanTransaction.findOne({ type: 'REPAYMENT', valueDate: { $gte: ptp.promiseDate }, amount: { $gte: ptp.amount } }).lean();
        ptp.status = paid ? 'KEPT' : 'BROKEN';
        await ptp.save();
      }
    });
    await step(run, 'notify', async () => {
      const loans = await LoanAccount.find({ status: 'ACTIVE' }).lean();
      for (const loan of loans) {
        const customer = await Customer.findById(loan.customerId).lean();
        if (!customer) continue;
        const next = (loan.schedule || []).find((line) => line.status !== 'PAID');
        if (!next) continue;
        const days = daysBetween(businessDate, next.dueDate);
        if (days === 5 || days === 1) {
          await notify('INSTALMENT_REMINDER', { id: customer._id, type: 'CUSTOMER', address: customer.mobile }, {
            customer, loan, fallback: `Instalment due on ${next.dueDate}.`,
          });
        }
        if (loan.dpd === 1 || loan.dpd === 7) {
          await notify('OVERDUE', { id: customer._id, type: 'CUSTOMER', address: customer.mobile }, {
            customer, loan, fallback: 'A payment is overdue.',
          });
        }
      }
    });
    await step(run, 'reconcile', async () => {
      const result = await reconcile(businessDate);
      const blocking = result.checks.filter((row) => !row.passed && !row.accepted && ['TB-01', 'TB-02', 'TB-06'].includes(row.code));
      if (blocking.length) {
        const error = httpError(409, 'End of day is blocked by reconciliation', { code: 'RECON_BREAK', details: { checks: result.checks } });
        throw error;
      }
    });
    entity.businessDate = addDays(businessDate, 1);
    await entity.save();
    run.status = 'COMPLETE';
    run.endedAt = new Date();
    await run.save();
    return { run, businessDate: entity.businessDate, closed: businessDate };
  } catch (err) {
    run.status = 'FAILED';
    run.endedAt = new Date();
    await run.save();
    throw err;
  }
}

export async function runEodTo(target, { actorId } = {}) {
  if (!target) throw httpError(400, 'A target date is required');
  const guard = 400;
  const results = [];
  for (let i = 0; i < guard; i += 1) {
    const entity = await Entity.findOne({ code: 'PK-01' }).lean();
    if (!entity) throw httpError(500, 'Entity PK-01 is not configured');
    if (entity.businessDate >= target) break;
    results.push(await runEod({ actorId }));
  }
  const entity = await Entity.findOne({ code: 'PK-01' }).lean();
  return { businessDate: entity.businessDate, runs: results.length };
}
