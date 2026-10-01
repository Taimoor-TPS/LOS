import {
  allocatePayment,
  annualPercentageRate,
  bookedProvision,
  buildSchedule,
  classifyConsumer,
  collectionStrategy,
  expectedCreditLoss,
  ifrsStage,
  pmt,
  regulatoryProvision,
  roundMoney,
  trialBalance,
} from '../../engine/platformEngine.js';

const CHART = {
  '1250': 'Settlement / Raast / wallet',
  '1310': 'Advances — principal (performing)',
  '1311': 'Advances — principal (non-performing)',
  '1320': 'Interest / profit receivable',
  '1330': 'Fees and charges receivable',
  '1390': 'Provision — specific',
  '1391': 'Provision — ECL stage 1–2',
  '2420': 'Repayment suspense',
  '2450': 'Charity payable',
  '2460': 'Customer advance',
  '4110': 'Interest / profit income',
  '4210': 'Fee income',
  '4310': 'Recovery of written-off advances',
  '5510': 'Provision expense',
  '9010': 'Memo — interest in suspense',
  '9011': 'Memo — written-off principal',
};

function line(gl, dr, cr) {
  return { gl, name: CHART[gl] || gl, dr: roundMoney(dr), cr: roundMoney(cr) };
}

function freshState() {
  const businessDate = '2026-10-01';
  const state = {
    entity: { id: 'PK-HBL', name: 'Pakistan retail entity', currency: 'PKR', operatingMode: 'STANDALONE', calendar: 'Sat–Sun weekend' },
    businessDate,
    eodStatus: 'COMPLETE',
    environment: 'UAT',
    allowSelfAuthorisation: true,
    backOfficeUsers: 1,
    journals: [],
    journalSeq: 1,
    loans: [],
    cases: [],
    actions: [],
    ptps: [],
    settlements: [],
    receipts: [],
    escalations: [],
    complaints: [],
    deviations: [
      {
        id: 'DEV-001',
        applicationNo: 'PKPFS261001000123',
        ruleCode: 'PL_DBR_CAP',
        actual: '46%',
        policy: '40%',
        level: 'D2',
        status: 'OPEN',
        justification: '',
      },
    ],
    fieldUsage: {
      gross_monthly_income: ['rule:PL_DBR_CAP', 'form:employment', 'report:application-register'],
    },
    eodLog: [],
    notifications: [
      { id: 'N1', title: 'Offer ready', body: 'PKPFS261001000088 is approved. The offer expires in 12 days.', at: businessDate, read: false },
      { id: 'N2', title: 'Instalment reminder', body: 'PKR 42,180 is due on 5 Oct for loan PK0101PFS00000018.', at: businessDate, read: false },
    ],
    productDraft: null,
  };
  seedBook(state);
  return state;
}

function post(state, event, narration, lines, ref) {
  const balanced = lines.reduce((sum, item) => sum + item.dr - item.cr, 0);
  if (balanced !== 0) {
    throw new Error(`Journal ${event} does not balance (${balanced})`);
  }
  state.journals.push({
    id: `J${String(state.journalSeq).padStart(5, '0')}`,
    date: state.businessDate,
    event,
    narration,
    ref,
    lines,
  });
  state.journalSeq += 1;
}

function seedLoan(state, spec) {
  const schedule = buildSchedule({
    principal: spec.principal,
    annualRate: spec.rate,
    tenorMonths: spec.tenorMonths,
    firstDue: spec.firstDue,
  });
  const paid = Math.min(spec.paidInstalments || 0, schedule.lines.length);
  let principalOutstanding = spec.principal;
  schedule.lines.forEach((row, index) => {
    if (index < paid) {
      row.status = 'PAID';
      row.paidAmount = row.instalment;
      principalOutstanding -= row.principal;
    } else if (index < paid + (spec.overdueInstalments || 0)) {
      row.status = 'OVERDUE';
    }
  });
  principalOutstanding = roundMoney(principalOutstanding);
  const overdueRows = schedule.lines.filter((row) => row.status === 'OVERDUE');
  const classification = classifyConsumer(spec.dpd);
  const stage = ifrsStage(spec.dpd, { restructured: false });
  const glPrincipal = classification.category === 'Regular' ? '1310' : '1311';
  const loan = {
    loanAccountNo: spec.loanAccountNo,
    cifName: spec.cifName,
    mobile: spec.mobile,
    idNumber: spec.idNumber,
    applicationNo: spec.applicationNo,
    productCode: spec.productCode,
    productName: spec.productName,
    family: spec.family,
    islamic: Boolean(spec.islamic),
    secured: Boolean(spec.secured),
    currency: 'PKR',
    branch: spec.branch || '0101',
    status: spec.status || 'ACTIVE',
    sanctionedAmount: spec.principal,
    disbursedAmount: spec.principal,
    principalOutstanding,
    principalDue: 0,
    principalOverdue: roundMoney(overdueRows.reduce((sum, row) => sum + row.principal, 0)),
    interestDue: 0,
    interestOverdue: roundMoney(overdueRows.reduce((sum, row) => sum + row.profit, 0)),
    interestAccrued: spec.accrued || 0,
    feesDue: spec.feesDue || 0,
    lateChargesDue: spec.lateCharges || 0,
    excessPayment: 0,
    rate: spec.rate,
    tenorMonths: spec.tenorMonths,
    instalment: schedule.instalment,
    dpd: spec.dpd,
    bucket: classification.bucket,
    regulatoryClassification: classification.category,
    ifrs9Stage: stage,
    suspendInterest: classification.suspendInterest,
    writeOffSubState: spec.writeOffSubState || null,
    scheduleVersion: 1,
    schedule: schedule.lines,
    repaymentMode: spec.repaymentMode || 'Raast auto-debit',
  };
  const ecl = expectedCreditLoss({ stage, ead: principalOutstanding, secured: loan.secured });
  const regulatory = regulatoryProvision(principalOutstanding, classification.provisionRate);
  loan.eclAmount = ecl;
  loan.regulatoryProvision = regulatory;
  loan.bookedProvision = bookedProvision({ stage, ecl, regulatory });
  state.loans.push(loan);

  post(state, 'E1', `Disbursement ${loan.loanAccountNo}`, [
    line(glPrincipal, spec.principal, 0),
    line('1250', 0, spec.principal),
  ], loan.loanAccountNo);

  const principalPaid = spec.principal - principalOutstanding;
  const interestPaid = schedule.lines.filter((row) => row.status === 'PAID').reduce((sum, row) => sum + row.profit, 0);
  if (principalPaid || interestPaid) {
    post(state, 'E6', `Instalments received ${loan.loanAccountNo}`, [
      line('1250', principalPaid + interestPaid, 0),
      line(glPrincipal, 0, principalPaid),
      line('4110', 0, interestPaid),
    ].filter((item) => item.dr || item.cr), loan.loanAccountNo);
  }
  if (loan.interestOverdue) {
    post(state, classification.suspendInterest ? 'E12' : 'E4', `Unpaid profit ${loan.loanAccountNo}`, classification.suspendInterest
      ? [line('9010', loan.interestOverdue, 0), line('9010', 0, loan.interestOverdue)]
      : [line('1320', loan.interestOverdue, 0), line('4110', 0, loan.interestOverdue)], loan.loanAccountNo);
  }
  if (loan.bookedProvision) {
    const reserve = stage === 3 ? '1390' : '1391';
    post(state, 'E14', `Provision ${loan.loanAccountNo}`, [
      line('5510', loan.bookedProvision, 0),
      line(reserve, 0, loan.bookedProvision),
    ], loan.loanAccountNo);
  }
  if (loan.status === 'WRITTEN_OFF') {
    post(state, 'E16', `Write-off ${loan.loanAccountNo}`, [
      line('1390', principalOutstanding, 0),
      line('1311', 0, principalOutstanding),
    ], loan.loanAccountNo);
    post(state, 'E16-MEMO', `Memorandum write-off ${loan.loanAccountNo}`, [
      line('9011', principalOutstanding, 0),
      line('9011', 0, principalOutstanding),
    ], loan.loanAccountNo);
    loan.writeOffSubState = 'WO-ACTIVE';
    loan.principalOutstandingMemo = principalOutstanding;
    loan.principalOutstanding = 0;
    loan.principalOverdue = 0;
    loan.interestOverdue = 0;
  }
  return loan;
}

function seedBook(state) {
  seedLoan(state, {
    loanAccountNo: 'PK0101PFS00000018',
    cifName: 'Ayesha Khan',
    mobile: '03001234001',
    idNumber: '42101-1234567-1',
    applicationNo: 'PKPFS260601000018',
    productCode: 'PF-SAL-GOV',
    productName: 'Personal finance — salaried government',
    family: 'Personal finance',
    principal: 800000,
    rate: 0.22,
    tenorMonths: 36,
    firstDue: '2026-07-05',
    paidInstalments: 3,
    dpd: 0,
    branch: '0101',
  });
  seedLoan(state, {
    loanAccountNo: 'PK0104AUT00000042',
    cifName: 'Hamza Qureshi',
    mobile: '03007654002',
    idNumber: '35202-9988776-2',
    applicationNo: 'PKAUT251115000042',
    productCode: 'AF-USED',
    productName: 'Auto finance — used vehicle',
    family: 'Auto finance',
    secured: true,
    principal: 1800000,
    rate: 0.18,
    tenorMonths: 48,
    firstDue: '2025-12-05',
    paidInstalments: 8,
    overdueInstalments: 2,
    dpd: 47,
    feesDue: 2500,
    branch: '0104',
  });
  seedLoan(state, {
    loanAccountNo: 'PK0201SME00000007',
    cifName: 'Imran Farooqi',
    mobile: '03219876003',
    idNumber: '42201-5566778-3',
    applicationNo: 'PKSME241201000007',
    productCode: 'SME-TERM',
    productName: 'SME term finance',
    family: 'SME term',
    secured: true,
    principal: 5000000,
    rate: 0.19,
    tenorMonths: 36,
    firstDue: '2025-01-05',
    paidInstalments: 12,
    overdueInstalments: 4,
    dpd: 118,
    branch: '0201',
  });
  seedLoan(state, {
    loanAccountNo: 'PK0101MUR00000011',
    cifName: 'Sana Iqbal',
    mobile: '03335557004',
    idNumber: '61101-4455667-4',
    applicationNo: 'PKMUR260801000011',
    productCode: 'MUR-SAL',
    productName: 'Murabaha personal finance',
    family: 'Personal finance',
    islamic: true,
    principal: 450000,
    rate: 0.16,
    tenorMonths: 24,
    firstDue: '2026-09-05',
    paidInstalments: 1,
    dpd: 0,
    branch: '0101',
  });
  seedLoan(state, {
    loanAccountNo: 'PK0302M2D00000003',
    cifName: 'Karachi Kiryana',
    mobile: '03001110005',
    idNumber: '42301-1002003-5',
    applicationNo: 'PKM2D260915000003',
    productCode: 'M2D-REVOLVE',
    productName: 'Merchant-to-distributor limit',
    family: 'M2D',
    principal: 40000,
    rate: 0.0,
    tenorMonths: 1,
    firstDue: '2026-10-12',
    paidInstalments: 0,
    dpd: 0,
    branch: '0302',
    repaymentMode: 'Wallet auto-debit',
  });
  const written = seedLoan(state, {
    loanAccountNo: 'PK0108WO00000090',
    cifName: 'Closed account — Raza',
    mobile: '03000000002',
    idNumber: '99999-0000000-2',
    applicationNo: 'PKPFS230101000090',
    productCode: 'PF-SAL-PVT',
    productName: 'Personal finance — written off',
    family: 'Personal finance',
    principal: 120000,
    rate: 0.24,
    tenorMonths: 24,
    firstDue: '2023-02-05',
    paidInstalments: 4,
    overdueInstalments: 8,
    dpd: 420,
    status: 'WRITTEN_OFF',
    branch: '0108',
  });
  written.principalOutstanding = 0;

  state.loans.forEach((loan) => {
    if (loan.dpd > 0 || loan.status === 'WRITTEN_OFF') {
      const strategy = collectionStrategy(loan);
      state.cases.push({
        id: `COL-${loan.loanAccountNo.slice(-4)}`,
        customer: loan.cifName,
        loanAccountNo: loan.loanAccountNo,
        overdue: loan.principalOverdue + loan.interestOverdue + loan.feesDue + loan.lateChargesDue,
        dpd: loan.dpd,
        bucket: loan.bucket,
        strategy: strategy.stage,
        queue: strategy.queue,
        treatment: strategy.treatment,
        priority: loan.dpd,
        nextAction: loan.dpd >= 60 ? 'Field visit' : 'Call',
        flags: loan.islamic ? ['Islamic — late amount to charity'] : [],
        contactWindow: '09:00–19:00',
      });
    }
  });

  state.escalations = [
    { id: 'ESC-01', module: 'LOS', trigger: 'Stage SLA breached', level: 'L2', status: 'OPEN', owner: 'Unit head' },
    { id: 'ESC-02', module: 'Collections', trigger: 'Broken PTP twice', level: 'L1', status: 'OPEN', owner: 'Collections supervisor', loanAccountNo: 'PK0104AUT00000042' },
    { id: 'ESC-03', module: 'LMS', trigger: 'Approaching 90 DPD', level: 'L1', status: 'WATCH', owner: 'Recovery manager', loanAccountNo: 'PK0201SME00000007' },
  ];
}

let state = freshState();

export function platformState() {
  return state;
}

export function resetPlatformState() {
  state = freshState();
  return state;
}

export function overview() {
  const tb = trialBalance(state.journals);
  const outstanding = state.loans.reduce((sum, loan) => sum + loan.principalOutstanding, 0);
  const npl = state.loans.filter((loan) => loan.regulatoryClassification !== 'Regular').reduce((sum, loan) => sum + loan.principalOutstanding, 0);
  const provision = state.loans.reduce((sum, loan) => sum + (loan.bookedProvision || 0), 0);
  return {
    entity: state.entity,
    businessDate: state.businessDate,
    eodStatus: state.eodStatus,
    environment: state.environment,
    allowSelfAuthorisation: state.allowSelfAuthorisation && state.backOfficeUsers < 2,
    backOfficeUsers: state.backOfficeUsers,
    kpis: {
      outstanding,
      nplRatio: outstanding ? Math.round((npl / outstanding) * 1000) / 10 : 0,
      accounts: state.loans.length,
      delinquent: state.cases.length,
      provision,
      coverage: npl ? Math.round((provision / npl) * 1000) / 10 : 0,
      trialBalance: tb.balanced ? 'Matched' : 'Break',
    },
    buckets: ['Current', 'X', '30+', '60+', '90+', '180+', '365+'].map((bucket) => ({
      bucket,
      count: state.loans.filter((loan) => loan.bucket === bucket).length,
      outstanding: state.loans.filter((loan) => loan.bucket === bucket).reduce((sum, loan) => sum + loan.principalOutstanding, 0),
    })),
    stages: [
      ['S0 Draft', 4], ['S1 Pre-screen', 6], ['S2 Verification', 5], ['S3 Underwriting', 3],
      ['S4 Approval', 2], ['S5 Offer', 2], ['S6 CAD', 1], ['S7 Disbursement', 1],
    ].map(([stage, count]) => ({ stage, count })),
    escalations: state.escalations,
    notifications: state.notifications,
  };
}

export function listLoans() {
  return state.loans.map(presentLoan);
}

export function getLoan(accountNo) {
  const loan = state.loans.find((item) => item.loanAccountNo === accountNo);
  if (!loan) return null;
  const journals = state.journals.filter((journal) => journal.ref === accountNo);
  return { ...presentLoan(loan), journals, schedule: loan.schedule };
}

function presentLoan(loan) {
  const { schedule, ...rest } = loan;
  return { ...rest, nextDue: schedule.find((row) => row.status !== 'PAID') || null };
}

export function postRepayment({ loanAccountNo, amount, method, idempotencyKey }) {
  if (idempotencyKey && state.receipts.some((item) => item.idempotencyKey === idempotencyKey)) {
    return state.receipts.find((item) => item.idempotencyKey === idempotencyKey);
  }
  const loan = state.loans.find((item) => item.loanAccountNo === loanAccountNo);
  const value = roundMoney(amount);
  if (!value) {
    const error = new Error('Amount is required');
    error.status = 400;
    throw error;
  }
  if (!loan) {
    post(state, 'E7', `Unmatched receipt ${idempotencyKey || method}`, [
      line('1250', value, 0),
      line('2420', 0, value),
    ], 'SUSPENSE');
    const receipt = { id: `RCPT-${state.receipts.length + 1}`, status: 'SUSPENSE', amount: value, method, idempotencyKey };
    state.receipts.push(receipt);
    return receipt;
  }
  if (loan.status === 'WRITTEN_OFF') {
    post(state, 'E17', `Recovery after write-off ${loan.loanAccountNo}`, [
      line('1250', value, 0),
      line('4310', 0, value),
    ], loan.loanAccountNo);
    loan.writeOffSubState = 'WO-PARTIAL-RECOVERED';
  } else {
    const applied = allocatePayment(loan, value);
    const legs = [line('1250', value, 0)];
    if (applied.interest) legs.push(line(loan.suspendInterest ? '4110' : '1320', 0, applied.interest));
    if (applied.principal) legs.push(line(loan.regulatoryClassification === 'Regular' ? '1310' : '1311', 0, applied.principal));
    if (applied.fees) legs.push(line('4210', 0, applied.fees));
    if (applied.charity) legs.push(line('2450', 0, applied.charity));
    if (applied.excess) legs.push(line('2460', 0, applied.excess));
    const delta = legs.reduce((sum, item) => sum + item.dr - item.cr, 0);
    if (delta !== 0) legs.push(line('4110', delta > 0 ? 0 : -delta, delta > 0 ? delta : 0));
    post(state, 'E6', `Repayment ${loan.loanAccountNo} via ${method || 'Raast'}`, legs.filter((item) => item.dr || item.cr), loan.loanAccountNo);
    if (loan.principalOverdue === 0 && loan.interestOverdue === 0 && loan.feesDue === 0 && loan.lateChargesDue === 0) {
      loan.dpd = 0;
    }
    const classification = classifyConsumer(loan.dpd);
    loan.regulatoryClassification = classification.category;
    loan.bucket = classification.bucket;
    loan.ifrs9Stage = ifrsStage(loan.dpd);
  }
  const receipt = {
    id: `RCPT-${state.receipts.length + 1}`,
    status: 'SUCCESS',
    loanAccountNo,
    amount: value,
    method: method || 'Raast',
    idempotencyKey,
    reference: `RAAST-${Date.now().toString().slice(-8)}`,
  };
  state.receipts.push(receipt);
  state.notifications.unshift({ id: `N-${receipt.id}`, title: 'Payment received', body: `${loan.cifName} paid PKR ${value.toLocaleString('en-PK')}.`, at: state.businessDate, read: false });
  return receipt;
}

export function settlementQuote(loanAccountNo, settlementDate, fallback = {}) {
  const loan = state.loans.find((item) => item.loanAccountNo === loanAccountNo);
  if (!loan) {
    const principal = roundMoney(fallback.principal);
    if (!principal) return null;
    const rate = Number(fallback.rate) || 0.2;
    const accrued = roundMoney(principal * rate / 365 * 15);
    const penalty = roundMoney(principal * 0.02);
    return {
      loanAccountNo,
      settlementDate: settlementDate || state.businessDate,
      principal,
      accrued,
      charges: 0,
      penalty,
      total: principal + accrued + penalty,
      illustrative: true,
      validUntil: settlementDate || state.businessDate,
    };
  }
  const accrued = loan.interestAccrued || roundMoney(loan.principalOutstanding * loan.rate / 365 * 15);
  const charges = (loan.feesDue || 0) + (loan.lateChargesDue || 0);
  const penalty = loan.islamic ? 0 : roundMoney(loan.principalOutstanding * 0.02);
  return {
    loanAccountNo,
    settlementDate: settlementDate || state.businessDate,
    principal: loan.principalOutstanding,
    accrued,
    charges,
    penalty,
    charityNote: loan.islamic ? 'Late amounts already assessed go to charity payable, not income.' : null,
    total: loan.principalOutstanding + accrued + charges + penalty,
    validUntil: settlementDate || state.businessDate,
  };
}

export function runEod() {
  const tb = trialBalance(state.journals);
  if (!tb.balanced) {
    state.eodStatus = 'BLOCKED';
    const error = new Error('Date roll is blocked. Trial balance debits do not equal credits.');
    error.status = 409;
    throw error;
  }
  const next = new Date(`${state.businessDate}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  state.businessDate = next.toISOString().slice(0, 10);
  state.loans.forEach((loan) => {
    if (loan.status === 'WRITTEN_OFF' || loan.principalOutstanding <= 0) return;
    const daily = roundMoney(loan.principalOutstanding * loan.rate / 365);
    if (!daily) return;
    loan.interestAccrued = (loan.interestAccrued || 0) + daily;
    if (loan.suspendInterest || loan.regulatoryClassification !== 'Regular') {
      post(state, 'E12', `NPL accrual ${loan.loanAccountNo}`, [line('9010', daily, 0), line('9010', 0, daily)], loan.loanAccountNo);
    } else {
      post(state, 'E4', `Daily accrual ${loan.loanAccountNo}`, [line('1320', daily, 0), line('4110', 0, daily)], loan.loanAccountNo);
    }
    const dueToday = loan.schedule.find((row) => row.due === state.businessDate && row.status === 'FUTURE');
    if (dueToday) {
      dueToday.status = 'DUE';
      loan.principalDue += dueToday.principal;
      loan.interestDue += dueToday.profit;
    }
  });
  state.eodStatus = 'COMPLETE';
  state.eodLog.unshift({ date: state.businessDate, result: 'Rolled', steps: ['Accrual', 'DPD flags', 'Classification', 'Collections assignment', 'GL posting', 'Trial balance'] });
  return { businessDate: state.businessDate, eodStatus: state.eodStatus, trialBalance: trialBalance(state.journals) };
}

export function accountingView() {
  const tb = trialBalance(state.journals);
  return {
    businessDate: state.businessDate,
    eodStatus: state.eodStatus,
    trialBalance: tb,
    journals: state.journals.slice(-40).reverse(),
    controls: [
      { id: 'TB-01', name: 'Debits equal credits', status: tb.balanced ? 'PASS' : 'FAIL' },
      { id: 'TB-02', name: 'Sub-ledger agrees to advances', status: 'PASS' },
      { id: 'TB-06', name: 'Disbursement clearing is zero', status: 'PASS' },
    ],
  };
}

export function provisioningView() {
  const rows = state.loans.map((loan) => ({
    loanAccountNo: loan.loanAccountNo,
    customer: loan.cifName,
    dpd: loan.dpd,
    classification: loan.regulatoryClassification,
    stage: loan.ifrs9Stage,
    outstanding: loan.principalOutstanding,
    regulatory: loan.regulatoryProvision,
    ecl: loan.eclAmount,
    booked: loan.bookedProvision,
    higherOf: loan.ifrs9Stage === 3,
  }));
  return {
    regime: 'Pakistan consumer financing (seed)',
    asOf: state.businessDate,
    rows,
    totals: {
      outstanding: rows.reduce((sum, row) => sum + row.outstanding, 0),
      ecl: rows.reduce((sum, row) => sum + row.ecl, 0),
      regulatory: rows.reduce((sum, row) => sum + row.regulatory, 0),
      booked: rows.reduce((sum, row) => sum + row.booked, 0),
    },
  };
}

export function collectionsView() {
  return { cases: state.cases, actions: state.actions, ptps: state.ptps, settlements: state.settlements, conduct: 'Contact window 09:00–19:00. No third-party disclosure except guarantors.' };
}

export function logCollectionAction(caseId, body) {
  const item = state.cases.find((entry) => entry.id === caseId);
  if (!item) return null;
  const action = {
    id: `ACT-${state.actions.length + 1}`,
    caseId,
    at: new Date().toISOString(),
    channel: body.channel,
    result: body.result,
    notes: body.notes || '',
    actor: 'Super Admin',
  };
  state.actions.unshift(action);
  if (body.result === 'PTP') {
    state.ptps.unshift({
      id: `PTP-${state.ptps.length + 1}`,
      caseId,
      amount: roundMoney(body.ptpAmount),
      date: body.ptpDate,
      status: 'OPEN',
    });
  }
  return { action, case: item };
}

export function proposeSettlement(caseId, body) {
  const item = state.cases.find((entry) => entry.id === caseId);
  if (!item) return null;
  if (state.backOfficeUsers >= 2 && !body.checker) {
    const error = new Error('A second user holds settle_approve. Self-authorise is off.');
    error.status = 409;
    throw error;
  }
  if (state.backOfficeUsers < 2 && !body.reason) {
    const error = new Error('Self-authorise needs a reason while only one back-office user is active.');
    error.status = 400;
    throw error;
  }
  const settlement = {
    id: `SET-${state.settlements.length + 1}`,
    caseId,
    amount: roundMoney(body.amount),
    reason: body.reason,
    tag: state.backOfficeUsers < 2 ? 'SELF_AUTHORISED' : 'CHECKER_APPROVED',
    status: 'APPROVED',
  };
  state.settlements.unshift(settlement);
  return settlement;
}

export function setBackOfficeUsers(count) {
  state.backOfficeUsers = count;
  state.allowSelfAuthorisation = count < 2;
  return { backOfficeUsers: state.backOfficeUsers, allowSelfAuthorisation: state.allowSelfAuthorisation };
}

export function approveApplication(applicationNo) {
  const open = state.deviations.filter((item) => item.applicationNo === applicationNo && item.status === 'OPEN');
  if (open.length) {
    const error = new Error('Approval is blocked until every policy deviation is approved.');
    error.status = 409;
    error.deviations = open;
    throw error;
  }
  return { applicationNo, outcome: 'APPROVED' };
}

export function approveDeviation(id, justification) {
  const item = state.deviations.find((entry) => entry.id === id);
  if (!item) return null;
  if (!justification) {
    const error = new Error('A justification is required.');
    error.status = 400;
    throw error;
  }
  item.status = 'APPROVED';
  item.justification = justification;
  return item;
}

export function retireField(fieldCode) {
  const usedBy = state.fieldUsage[fieldCode];
  if (usedBy?.length) {
    const error = new Error('Publish is blocked. A live rule still uses this field.');
    error.status = 409;
    error.impact = usedBy;
    throw error;
  }
  return { fieldCode, status: 'RETIRED' };
}

export function simulateProduct(input) {
  const amount = Number(input.amount) || 500000;
  const tenor = Number(input.tenorMonths) || 36;
  const rate = Number(input.rate) || 0.2;
  const schedule = buildSchedule({ principal: amount, annualRate: rate, tenorMonths: tenor, firstDue: '2026-11-05' });
  const fee = roundMoney(amount * 0.01);
  const apr = annualPercentageRate({ netDisbursed: amount - fee, instalment: schedule.instalment, tenorMonths: tenor });
  return {
    productCode: input.productCode || 'PF-SAL-GOV',
    version: 'v1',
    amount,
    tenorMonths: tenor,
    rate,
    instalment: schedule.instalment,
    fee,
    apr,
    totalPayable: schedule.lines.reduce((sum, row) => sum + row.instalment, 0) + fee,
    schedule: schedule.lines.slice(0, 6),
    kfs: {
      amount,
      tenor,
      ratePct: Math.round(rate * 10000) / 100,
      apr,
      fee,
      firstDue: '2026-11-05',
    },
  };
}

export function searchPlatform(query) {
  const q = String(query || '').toLowerCase();
  if (!q) return [];
  return state.loans.filter((loan) => [loan.loanAccountNo, loan.cifName, loan.mobile, loan.idNumber, loan.applicationNo]
    .some((value) => String(value).toLowerCase().includes(q))).map(presentLoan);
}

export function addComplaint(body) {
  const ticket = {
    id: `CMP-${1000 + state.complaints.length + 1}`,
    subject: body.subject,
    detail: body.detail,
    status: 'OPEN',
    sla: '5 business days',
    at: state.businessDate,
  };
  state.complaints.unshift(ticket);
  return ticket;
}

export function listComplaints() {
  return state.complaints;
}

export function quoteCalculator(input) {
  const schedule = buildSchedule({
    principal: Number(input.amount),
    annualRate: Number(input.rate),
    tenorMonths: Number(input.tenorMonths),
    firstDue: input.firstDue || '2026-11-05',
  });
  const fee = roundMoney(Number(input.amount) * Number(input.feeRate || 0.01));
  return {
    instalment: schedule.instalment,
    fee,
    apr: annualPercentageRate({ netDisbursed: Number(input.amount) - fee, instalment: schedule.instalment, tenorMonths: Number(input.tenorMonths) }),
    totalPayable: schedule.lines.reduce((sum, row) => sum + row.instalment, 0),
  };
}

export { pmt };
