import { z } from 'zod';
import { LoanAccount, ServicingRequest } from '../model/LoanAccount.js';
import { Customer } from '../../customers/model/Customer.js';
import { Product } from '../../products/model/Product.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { buildContractSchedule, quotePayment } from '../../../engine/money.js';
import { toFeatures, loadPolicy, activeScorecard } from '../../../engine/decisionService.js';
import { evaluateApplication } from '../../../engine/decisionEngine.js';
import { Rule } from '../../rules/model/Rule.js';
import { ROLES } from '../../../security/roles.js';

async function ownLoan(req, loan) {
  if (req.user.role === ROLES.CUSTOMER && String(loan.customerId) !== req.user.customerId) {
    throw httpError(403, 'You do not have access to this loan');
  }
}

export const mine = asyncHandler(async (req, res) => {
  const filter = req.user.role === ROLES.CUSTOMER ? { customerId: req.user.customerId } : { tenantId: req.user.tenantId };
  const loans = await LoanAccount.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ loans });
});

export const getOne = asyncHandler(async (req, res) => {
  const loan = await LoanAccount.findById(req.params.id);
  if (!loan) throw httpError(404, 'Loan not found');
  await ownLoan(req, loan);
  const requests = await ServicingRequest.find({ loanId: loan._id }).sort({ createdAt: -1 }).lean();
  res.json({ loan, requests });
});

export const requestChange = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    type: z.enum(['topup', 'prepay', 'restructure']),
    amount: z.number().positive(),
    tenorMonths: z.number().int().positive().optional(),
  }), req.body);
  const loan = await LoanAccount.findById(req.params.id);
  if (!loan) throw httpError(404, 'Loan not found');
  await ownLoan(req, loan);
  const customer = await Customer.findById(loan.customerId);
  const product = await Product.findOne({ code: loan.productCode }).lean();
  const tenor = body.tenorMonths || loan.tenorMonths;
  const amount = body.type === 'prepay' ? Math.max(0, loan.principal - body.amount) : loan.principal + (body.type === 'topup' ? body.amount : 0);
  const policy = await loadPolicy({ jurisdiction: customer.jurisdiction, tenantId: customer.tenantId, segment: customer.segment, productCode: product.code, channel: 'app', entityId: customer.branchId });
  const scorecard = await activeScorecard(product.code, customer.segment);
  const rules = await Rule.find({ status: 'active', enabled: true }).lean();
  const virtual = {
    amount,
    tenorMonths: tenor,
    kycStatus: 'verified',
    jurisdiction: customer.jurisdiction,
    channel: 'app',
    productCode: product.code,
    indicativeRate: loan.rate,
    indicativeInstalment: quotePayment(product, amount, loan.rate, tenor),
    bureau: { score: customer.bureauScore, worstDpd: customer.bureauWorstDpd },
    screening: {},
    duplicateCount: 0,
    deviceRiskScore: 5,
  };
  const decision = evaluateApplication({
    features: toFeatures(customer, virtual, product),
    product,
    rules,
    scorecard,
    regulatory: policy['regulatory.dbr'].value,
    pricing: policy['pricing.bands'].value,
    doa: policy['doa.matrix'].value,
    fraud: policy['fraud.thresholds'].value,
  });
  const preview = {
    amount,
    tenorMonths: tenor,
    instalment: quotePayment(product, amount, decision.pricing.rate, tenor),
    rate: decision.pricing.rate,
  };
  const request = await ServicingRequest.create({
    tenantId: loan.tenantId,
    loanId: loan._id,
    customerId: loan.customerId,
    type: body.type,
    amount: body.amount,
    tenorMonths: tenor,
    status: decision.outcome === 'approve' ? 'offered' : decision.outcome,
    decision,
    preview,
  });
  res.status(201).json({ request });
});

export const acceptRequest = asyncHandler(async (req, res) => {
  const request = await ServicingRequest.findById(req.params.requestId);
  if (!request || request.status !== 'offered') throw httpError(409, 'There is no offer to accept');
  const loan = await LoanAccount.findById(request.loanId);
  await ownLoan(req, loan);
  loan.principal = request.preview.amount;
  loan.tenorMonths = request.preview.tenorMonths;
  loan.rate = request.preview.rate;
  loan.instalment = request.preview.instalment;
  loan.schedule = buildContractSchedule({
    contractType: loan.contractType,
    principal: loan.principal,
    annualRate: loan.rate,
    tenorMonths: loan.tenorMonths,
    payment: loan.instalment,
  });
  loan.paidCount = 0;
  await loan.save();
  request.status = 'booked';
  await request.save();
  res.json({ loan, request });
});
