import mongoose from 'mongoose';
import { LoanAccount } from '../modules/servicing/model/LoanAccount.js';
import { LoanTransaction, Entity } from '../models/platformModels.js';
import { allocatePayment } from '../engine/platformEngine.js';
import { postEvent } from './accounting.js';
import { notify } from './notify.js';
import { httpError } from '../security/http.js';
import { Customer } from '../modules/customers/model/Customer.js';
import { sendPayment } from '../integrations/adapters.js';
import { writeAudit } from '../security/audit.js';

const BALANCE_KEYS = ['feesDue', 'lateChargesDue', 'interestDue', 'interestOverdue', 'principalDue', 'principalOverdue', 'principalOutstanding', 'excessPayment', 'charityPayable'];

export async function postRepayment({ loanId, amount, channel, idempotencyKey, method, actor, req }) {
  if (!idempotencyKey) throw httpError(400, 'An idempotency key is required');
  const existing = await LoanTransaction.findOne({ idempotencyKey }).lean();
  if (existing) return { transaction: existing, idempotent: true };
  const loan = await LoanAccount.findById(loanId);
  if (!loan || loan.status === 'CLOSED') throw httpError(404, 'Loan not found');
  if (loan.frozen) throw httpError(409, 'This loan is frozen');
  const entity = await Entity.findOne({ code: loan.entityId || 'PK-01' });
  const businessDate = entity?.businessDate;
  const session = await mongoose.startSession();
  let transaction;
  try {
    session.startTransaction();
    const applied = allocatePayment(loan, amount);
    let principalLeft = applied.principal;
    let interestLeft = applied.interest;
    loan.schedule = (loan.schedule || []).map((line) => {
      const row = { ...line };
      if (row.status === 'PAID') return row;
      const pNeed = Math.max(0, Number(row.principal || 0) - Number(row.paidPrincipal || 0));
      const iNeed = Math.max(0, Number(row.interest || row.profit || 0) - Number(row.paidInterest || 0));
      const pPay = Math.min(principalLeft, pNeed);
      const iPay = Math.min(interestLeft, iNeed);
      principalLeft -= pPay;
      interestLeft -= iPay;
      row.paidPrincipal = Number(row.paidPrincipal || 0) + pPay;
      row.paidInterest = Number(row.paidInterest || 0) + iPay;
      row.paidAmount = Number(row.paidPrincipal) + Number(row.paidInterest);
      if (row.paidPrincipal >= Number(row.principal || 0) && row.paidInterest >= Number(row.interest || row.profit || 0)) {
        row.status = 'PAID';
        row.paidDate = businessDate;
      }
      return row;
    });
    loan.markModified('schedule');
    if (loan.principalOutstanding <= 0 && loan.principalDue <= 0) loan.status = 'CLOSED';
    const ctx = {
      amount: Math.round(Number(amount)),
      principal: applied.principal,
      interest: applied.interest,
      fees: applied.fees,
      charges: 0,
      charity: applied.charity,
      excess: applied.excess,
      productCode: loan.productCode,
      currency: loan.currency,
      branchId: loan.branchId,
      entityId: loan.entityId,
      valueDate: businessDate,
      businessDate,
      actorId: actor?.id || '',
    };
    const journal = await postEvent('E6', ctx, { session, narration: `Repayment ${loan.loanAccountNo}` });
    await sendPayment({ amount, method: method || channel, reference: idempotencyKey });
    const created = await LoanTransaction.create([{
      loanId: loan._id,
      type: 'REPAYMENT',
      valueDate: businessDate,
      businessDate,
      amount: Math.round(Number(amount)),
      components: applied,
      channel: channel || 'APP',
      idempotencyKey,
      journalId: journal?._id,
    }], { session });
    transaction = created[0];
    await loan.save({ session });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
  const customer = await Customer.findById(loan.customerId).lean();
  if (customer) {
    await notify('PAYMENT_RECEIVED', { id: customer._id, type: 'CUSTOMER', address: customer.mobile }, {
      customer, loan, fallback: `Payment of PKR ${Math.round(amount)} received.`, href: `/my-loans`,
    });
  }
  if (req) await writeAudit(req, { action: 'repayment', resource: 'loan', resourceId: loan._id, detail: { amount, idempotencyKey } });
  return { transaction, loan, idempotent: false };
}

export { BALANCE_KEYS };
