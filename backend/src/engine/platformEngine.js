/** Pure lending calculations from the Lending Platform FSD v1.0. */

export function roundMoney(value) {
  return Math.round(Number(value) || 0);
}

export function pmt(annualRate, tenorMonths, principal) {
  const months = Number(tenorMonths);
  const amount = Number(principal);
  if (!months || months <= 0 || !amount) return 0;
  const monthly = Number(annualRate) / 12;
  if (monthly === 0) return roundMoney(amount / months);
  const factor = (1 + monthly) ** months;
  return roundMoney((amount * monthly * factor) / (factor - 1));
}

export function pv(annualRate, tenorMonths, instalment) {
  const months = Number(tenorMonths);
  const payment = Number(instalment);
  const monthly = Number(annualRate) / 12;
  if (!months || !payment) return 0;
  if (monthly === 0) return roundMoney(payment * months);
  const factor = (1 + monthly) ** -months;
  return roundMoney((payment * (1 - factor)) / monthly);
}

export function buildSchedule({ principal, annualRate, tenorMonths, firstDue }) {
  let balance = roundMoney(principal);
  const payment = pmt(annualRate, tenorMonths, balance);
  const monthly = Number(annualRate) / 12;
  const start = firstDue ? new Date(firstDue) : new Date('2026-07-05');
  const lines = [];
  for (let n = 1; n <= tenorMonths; n += 1) {
    const profit = roundMoney(balance * monthly);
    let principalPart = payment - profit;
    if (n === tenorMonths || principalPart > balance) principalPart = balance;
    if (principalPart < 0) principalPart = 0;
    const instalment = principalPart + profit;
    balance = Math.max(0, balance - principalPart);
    const due = new Date(start);
    due.setMonth(start.getMonth() + (n - 1));
    lines.push({
      n,
      due: due.toISOString().slice(0, 10),
      opening: balance + principalPart,
      instalment,
      principal: principalPart,
      profit,
      closing: balance,
      status: 'FUTURE',
      paidAmount: 0,
    });
  }
  return { instalment: lines[0]?.instalment || payment, lines };
}

export function bucketForDpd(dpd) {
  const days = Number(dpd) || 0;
  if (days >= 365) return '365+';
  if (days >= 180) return '180+';
  if (days >= 90) return '90+';
  if (days >= 60) return '60+';
  if (days >= 30) return '30+';
  if (days >= 1) return 'X';
  return 'Current';
}

/** Pakistan consumer PR seed (FSD 17.2). Rates are configuration, not hard-coded policy. */
export function classifyConsumer(dpd) {
  const days = Number(dpd) || 0;
  const bucket = bucketForDpd(days);
  if (days >= 365) return { category: 'Loss', provisionRate: 1, suspendInterest: true, bucket };
  if (days >= 180) return { category: 'Doubtful', provisionRate: 0.5, suspendInterest: true, bucket };
  if (days >= 90) return { category: 'Substandard', provisionRate: 0.25, suspendInterest: true, bucket };
  return { category: 'Regular', provisionRate: 0, suspendInterest: false, bucket };
}

export function ifrsStage(dpd, { restructured = false } = {}) {
  const days = Number(dpd) || 0;
  if (days >= 90) return 3;
  if (days >= 60 || restructured) return 2;
  return 1;
}

export function expectedCreditLoss({ stage, ead, secured }) {
  const pd = { 1: 0.015, 2: 0.08, 3: 0.4 }[stage] || 0.015;
  const lgd = secured ? 0.35 : 0.65;
  return roundMoney(pd * lgd * Number(ead || 0));
}

export function regulatoryProvision(outstanding, provisionRate) {
  return roundMoney(Number(outstanding || 0) * Number(provisionRate || 0));
}

/** Stage 3 books the higher of IFRS 9 ECL and the prudential requirement (FSD 17). */
export function bookedProvision({ stage, ecl, regulatory }) {
  if (stage === 3) return Math.max(ecl, regulatory);
  return ecl;
}

export function collectionStrategy(loan) {
  if (loan.status === 'WRITTEN_OFF') {
    return { stage: 'Written-off recovery', queue: 'Recovery unit', treatment: 'Specialist agency and settlement campaign' };
  }
  const dpd = Number(loan.dpd) || 0;
  if (dpd >= 180) return { stage: 'Legal', queue: 'Legal', treatment: 'Demand notice and suit tracking' };
  if (dpd >= 90) return { stage: 'NPL / recovery', queue: 'Recovery unit', treatment: 'Legal notice, collateral intent, settlement' };
  if (dpd >= 60) return { stage: 'Late', queue: 'Field', treatment: 'Field visit, guarantor contact, restructuring offer' };
  if (dpd >= 30) return { stage: 'Mid', queue: 'Tele + field', treatment: 'Tele-calling with escalation' };
  if (dpd >= 1) return { stage: 'Early (soft)', queue: 'Tele-collections', treatment: 'Messages, IVR, pay link' };
  return { stage: 'Pre-delinquency', queue: 'System', treatment: 'Reminder and auto-debit retry' };
}

/**
 * Performing waterfall: fees, interest due, principal due, then excess.
 * Non-performing: principal overdue, interest overdue, charges (FSD 13.4).
 * Islamic late charges are tagged charity, not income.
 */
export function allocatePayment(loan, amount) {
  let left = roundMoney(amount);
  const applied = { fees: 0, interest: 0, principal: 0, charity: 0, excess: 0 };
  const take = (key) => {
    const available = roundMoney(loan[key] || 0);
    const used = Math.min(left, available);
    loan[key] = available - used;
    left -= used;
    return used;
  };
  const npl = loan.regulatoryClassification && loan.regulatoryClassification !== 'Regular';
  if (npl) {
    applied.principal += take('principalOverdue');
    applied.interest += take('interestOverdue');
    const charges = take('lateChargesDue');
    if (loan.islamic) applied.charity += charges;
    else applied.fees += charges;
  } else {
    const charges = take('feesDue') + take('lateChargesDue');
    if (loan.islamic) applied.charity += charges;
    else applied.fees += charges;
    applied.interest += take('interestDue') + take('interestOverdue');
    applied.principal += take('principalDue') + take('principalOverdue');
    if (left > 0) {
      const headroom = Math.max(0, roundMoney(loan.principalOutstanding) - applied.principal);
      const extra = Math.min(left, headroom);
      applied.principal += extra;
      left -= extra;
    }
  }
  loan.principalOutstanding = Math.max(0, roundMoney(loan.principalOutstanding) - applied.principal);
  applied.excess = left;
  loan.excessPayment = roundMoney((loan.excessPayment || 0) + left);
  return applied;
}

export function dbrPercent(obligations, income) {
  const net = Number(income) || 0;
  if (net <= 0) return null;
  return Math.round((Number(obligations) / net) * 10000) / 100;
}

export function eligibilityResult(input) {
  const reasons = [];
  const age = Number(input.age);
  const income = Number(input.netMonthlyIncome) || 0;
  const obligations = Number(input.existingObligations) || 0;
  const requested = Number(input.requestedAmount) || 0;
  const tenor = Number(input.tenorMonths) || 36;
  const rate = Number(input.annualRate) || 0.22;
  if (input.writeOffHit) reasons.push('We are unable to offer this product at this time.');
  if (input.sanctionsPotential) reasons.push('Your application needs a manual review before we can continue.');
  if (input.cardStatus && input.cardStatus !== 'VALID') reasons.push('The identity document is not valid.');
  if (age && (age < 21 || age > 60)) reasons.push('Age is outside the product range.');
  if (income < 50000) reasons.push('Income does not meet the requirement.');
  const proposed = pmt(rate, tenor, requested || income * 10);
  const dbr = dbrPercent(obligations + proposed, income);
  const cap = 40;
  if (dbr != null && dbr > cap) reasons.push('The instalment would take debt burden above the 40% cap.');
  const maxEmi = Math.max(0, income * (cap / 100) - obligations);
  const maxAmount = pv(rate, tenor, maxEmi);
  const eligible = reasons.length === 0;
  return {
    eligible,
    outcome: eligible ? 'LIKELY_ELIGIBLE' : input.sanctionsPotential ? 'UNDER_REVIEW' : 'NOT_ELIGIBLE',
    reasons: eligible ? [] : reasons,
    indicativeLimit: eligible ? Math.min(requested || maxAmount, maxAmount, 3000000) : 0,
    proposedInstalment: proposed,
    dbr,
    dbrCap: cap,
    maxAmount,
  };
}

export function scoreBand(score) {
  const value = Number(score) || 0;
  if (value >= 680) return { band: 'A', action: 'Auto-approve within policy' };
  if (value >= 640) return { band: 'B', action: 'Auto-approve within policy' };
  if (value >= 600) return { band: 'C', action: 'Refer to analyst' };
  if (value >= 560) return { band: 'D', action: 'Refer, L3 minimum' };
  return { band: 'E', action: 'Decline' };
}

export function decisionOutcome({ knockOut, bureau, dbrWithinCap, band, deviations, bureauUnavailable }) {
  if (knockOut) return { outcome: 'AUTO_DECLINE', reason: 'Knock-out' };
  if (bureauUnavailable) return { outcome: 'REFER', reason: 'Manual bureau' };
  if (band === 'E') return { outcome: 'AUTO_DECLINE', reason: 'Score band E' };
  if (!dbrWithinCap) return { outcome: 'REFER', reason: 'DBR deviation', level: 'D2' };
  if (band === 'D') return { outcome: 'REFER', reason: 'Band D', level: 'L3' };
  if (deviations) return { outcome: 'REFER', reason: 'Policy deviation' };
  if (band === 'C' || bureau === 'minor') return { outcome: 'REFER', reason: 'Analyst review' };
  if ((band === 'A' || band === 'B') && bureau === 'clear') return { outcome: 'AUTO_APPROVE', reason: 'STP' };
  return { outcome: 'REFER', reason: 'Default refer' };
}

export function identityFromId(idNumber) {
  const digits = String(idNumber || '').replace(/\D/g, '');
  const tail = digits.slice(-4);
  if (tail === '0002') {
    return { cardStatus: 'VALID', flag: 'WRITE_OFF_HIT', bureau: 'write-off', message: 'Own-bank or bureau write-off hit.' };
  }
  if (tail === '0003') {
    return { cardStatus: 'VALID', flag: 'SANCTIONS_POTENTIAL', bureau: 'held', message: 'Potential sanctions match. Do not disclose the list hit to the customer.' };
  }
  if (tail === '0004') {
    return { cardStatus: 'EXPIRED', flag: 'KYC_MANUAL', bureau: 'not_called', message: 'Card status is not VALID.' };
  }
  if (tail === '0005') {
    return { cardStatus: 'VALID', flag: 'FACE_MATCH_LOW', bureau: 'clear', faceScore: 42, message: 'Face match is below the threshold.' };
  }
  if (tail === '0006') {
    return { cardStatus: 'VALID', flag: null, bureau: 'timeout', message: 'Bureau did not respond in time.' };
  }
  if (tail === '0001') {
    return { cardStatus: 'VALID', flag: null, bureau: 'clear', bureauScore: 742, message: 'Identity verified. Bureau is clear.' };
  }
  return { cardStatus: 'VALID', flag: null, bureau: 'clear', bureauScore: 700, message: 'Identity verified. Bureau is clear.' };
}

export function annualPercentageRate({ netDisbursed, instalment, tenorMonths }) {
  let rate = 0.01;
  const flows = [-Number(netDisbursed), ...Array.from({ length: tenorMonths }, () => Number(instalment))];
  for (let i = 0; i < 40; i += 1) {
    let npv = 0;
    let derivative = 0;
    flows.forEach((cash, t) => {
      const disc = (1 + rate) ** t;
      npv += cash / disc;
      if (t > 0) derivative -= (t * cash) / ((1 + rate) ** (t + 1));
    });
    if (Math.abs(derivative) < 1e-9) break;
    const next = rate - npv / derivative;
    if (!Number.isFinite(next) || next <= -0.9) break;
    if (Math.abs(next - rate) < 1e-8) {
      rate = next;
      break;
    }
    rate = next;
  }
  const annual = (1 + rate) ** 12 - 1;
  return Math.round(annual * 10000) / 100;
}

export function journalBalances(lines) {
  return lines.reduce((sum, line) => sum + roundMoney(line.dr) - roundMoney(line.cr), 0);
}

export function approvalGate({ openDeviations, applicationNo }) {
  if (openDeviations > 0) throw new Error('Approval is blocked while a policy deviation is open');
  return { applicationNo, outcome: 'APPROVED' };
}

export function trialBalance(journals) {
  const accounts = new Map();
  journals.forEach((journal) => {
    journal.lines.forEach((line) => {
      const row = accounts.get(line.gl) || { gl: line.gl, name: line.name, opening: 0, debit: 0, credit: 0 };
      row.debit += roundMoney(line.dr);
      row.credit += roundMoney(line.cr);
      row.name = line.name || row.name;
      accounts.set(line.gl, row);
    });
  });
  const rows = [...accounts.values()].map((row) => ({
    ...row,
    closing: row.opening + row.debit - row.credit,
  })).sort((a, b) => a.gl.localeCompare(b.gl));
  const debit = rows.reduce((sum, row) => sum + row.debit, 0);
  const credit = rows.reduce((sum, row) => sum + row.credit, 0);
  return { rows, debit, credit, balanced: debit === credit };
}
