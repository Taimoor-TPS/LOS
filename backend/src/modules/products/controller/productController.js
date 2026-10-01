import { z } from 'zod';
import { Product } from '../model/Product.js';
import { Customer } from '../../customers/model/Customer.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { processingFee, quotePayment, rateCaption } from '../../../engine/money.js';
import { assessAffordability } from '../../../engine/affordability.js';
import { loadPolicy } from '../../../engine/decisionService.js';
export const list = asyncHandler(async (req, res) => {
  const filter = { status: { $in: ['active', 'PUBLISHED', 'DRAFT', 'PENDING_APPROVAL'] }, deletedAt: null };
  if (req.user.principal === 'CUSTOMER') filter.status = { $in: ['active', 'PUBLISHED'] };
  if (req.query.family) filter.family = String(req.query.family);
  if (req.query.status) filter.status = String(req.query.status);
  const products = await Product.find(filter).sort({ family: 1, name: 1 }).lean();
  res.json({ products, items: products, page: 1, pageSize: products.length, total: products.length });
});

export const getOne = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ code: req.params.code }).lean();
  if (!product) throw httpError(404, 'Product not found');
  res.json({ product });
});

export const quote = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    productCode: z.string(),
    amount: z.number().positive(),
    tenorMonths: z.number().int().positive(),
    customerId: z.string().optional(),
  }), req.body);
  const product = await Product.findOne({ code: body.productCode, status: 'active' }).lean();
  if (!product) throw httpError(404, 'Product not found');
  const customerId = req.user.principal === 'CUSTOMER' ? req.user.customerId : (body.customerId || req.user.customerId);
  const customer = await Customer.findById(customerId).lean();
  if (!customer) throw httpError(404, 'Customer not found');
  const policy = await loadPolicy({
    jurisdiction: customer.jurisdiction,
    tenantId: customer.tenantId,
    segment: customer.segment,
    productCode: product.code,
    channel: 'app',
    entityId: customer.branchId,
  });
  const regulatory = policy['regulatory.dbr'].value || {};
  const income = product.affordabilityMode === 'cashflow' ? customer.cashflowMonthly : customer.monthlyIncome;
  const payment = quotePayment(product, body.amount, product.baseRate, body.tenorMonths);
  const affordability = assessAffordability({
    income,
    obligations: customer.monthlyObligations,
    instalment: payment,
    regulatory,
    mode: product.affordabilityMode,
  });
  const fee = processingFee(body.amount, product);
  const withinBand = body.amount >= product.minAmount && body.amount <= product.maxAmount
    && body.tenorMonths >= product.minTenor && body.tenorMonths <= product.maxTenor;
  const siblings = await Product.find({ status: 'active', jurisdiction: product.jurisdiction, code: { $ne: product.code } }).limit(3).lean();
  res.json({
    indicative: true,
    disclaimer: 'Indicative figures from the configured rate. The decision engine confirms the price.',
    product,
    amount: body.amount,
    tenorMonths: body.tenorMonths,
    rate: product.baseRate,
    rateLabel: rateCaption(product),
    instalment: payment,
    fee,
    totalPayable: payment * body.tenorMonths,
    totalCost: payment * body.tenorMonths - body.amount + fee,
    withinBand,
    affordability,
    currency: product.currency,
    comparisons: siblings.map((item) => ({
      code: item.code,
      name: item.name,
      family: item.family,
      instalment: quotePayment(item, Math.min(Math.max(body.amount, item.minAmount), item.maxAmount), item.baseRate, Math.min(Math.max(body.tenorMonths, item.minTenor), item.maxTenor)),
    })),
  });
});

const createBody = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  nameUr: z.string().optional(),
  summary: z.string().optional(),
  family: z.string().min(2),
  contractType: z.string().trim().min(1),
  jurisdiction: z.string().optional(),
  currency: z.string().optional(),
  segments: z.array(z.string()).optional(),
  employment: z.array(z.string()).optional(),
  minAmount: z.number().positive(),
  maxAmount: z.number().positive(),
  minTenor: z.number().int().positive(),
  maxTenor: z.number().int().positive(),
  baseRate: z.number().min(0),
  minRate: z.number().optional(),
  maxRate: z.number().optional(),
  feeRate: z.number().min(0).optional(),
  financingType: z.string().optional(),
  displayGroup: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
}).refine((body) => body.maxAmount >= body.minAmount, { message: 'Maximum amount must be at least the minimum amount' })
  .refine((body) => body.maxTenor >= body.minTenor, { message: 'Maximum tenor must be at least the minimum tenor' });

export const create = asyncHandler(async (req, res) => {
  const body = parse(createBody, req.body);
  const existing = await Product.findOne({ code: body.code });
  if (existing) throw httpError(409, 'A product with this code already exists');
  const product = await Product.create({
    jurisdiction: 'PK',
    currency: 'PKR',
    status: 'DRAFT',
    channels: ['mobile', 'internet', 'branch', 'rm', 'contact_centre', 'dealer'],
    showInCatalogue: true,
    amountStep: 5000,
    tenorStep: 6,
    repaymentMode: 'auto_debit',
    lgd: 0.45,
    phase: 1,
    ...body,
  });
  res.status(201).json({ product });
});

export const update = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ code: req.params.code });
  if (!product) throw httpError(404, 'Product not found');
  const body = parse(z.object({
    name: z.string().optional(),
    summary: z.string().optional(),
    baseRate: z.number().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    minTenor: z.number().optional(),
    maxTenor: z.number().optional(),
    feeRate: z.number().optional(),
    status: z.string().optional(),
  }).partial(), req.body);
  Object.assign(product, body);
  await product.save();
  res.json({ product });
});
