import { z } from 'zod';
import { Application, nextReference } from '../../applications/model/Application.js';
import { Customer, Consent } from '../../customers/model/Customer.js';
import { Product } from '../../products/model/Product.js';
import { Dealer } from '../model/Dealer.js';
import { AdapterRun } from '../../integrations/model/AdapterRun.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { quotePayment } from '../../../engine/money.js';
import { decideApplication, loadPolicy } from '../../../engine/decisionService.js';
import { sequenceFor } from '../../../engine/islamicEngine.js';

export const list = asyncHandler(async (req, res) => {
  const dealers = await Dealer.find().lean();
  res.json({ dealers });
});

export const originate = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    customerId: z.string(),
    productCode: z.string(),
    amount: z.number().positive(),
    tenorMonths: z.number().int().positive(),
    asset: z.object({ description: z.string(), value: z.number() }),
    consented: z.literal(true),
  }), req.body);
  const customer = await Customer.findById(body.customerId);
  const product = await Product.findOne({ code: body.productCode, status: 'active' });
  if (!customer || !product) throw httpError(404, 'Customer or product not found');
  const policy = await loadPolicy({ jurisdiction: customer.jurisdiction, tenantId: customer.tenantId, segment: customer.segment, productCode: product.code, channel: 'dealer', entityId: customer.branchId });
  const application = await Application.create({
    tenantId: customer.tenantId,
    reference: await nextReference(),
    customerId: customer._id,
    productCode: product.code,
    channel: 'dealer',
    branchId: customer.branchId,
    dealerId: req.user.dealerId,
    jurisdiction: customer.jurisdiction,
    contractType: product.contractType,
    currency: product.currency,
    amount: body.amount,
    tenorMonths: body.tenorMonths,
    indicativeRate: product.baseRate,
    indicativeInstalment: quotePayment(product, body.amount, product.baseRate, body.tenorMonths),
    asset: body.asset,
    sequence: sequenceFor(product.contractType, policy['islamic.sequences']?.value),
    kycStatus: 'verified',
    status: 'verified',
    submittedAt: new Date(),
    screening: { sanctions: customer.sanctionsFlag, pep: customer.pepFlag, adverseMedia: false, provider: 'screening-simulator' },
    bureau: { score: customer.bureauScore || 0, worstDpd: customer.bureauWorstDpd || 0, writeOff: false, source: 'ecib', pulledAt: new Date() },
    incomeVerified: true,
    incomeSource: 'dealer_assisted',
    assignedTo: req.user.name,
  });
  await Consent.insertMany(['identity', 'bureau', 'salary'].map((purpose) => ({
    tenantId: customer.tenantId,
    customerId: customer._id,
    applicationId: application._id,
    purpose,
    scope: purpose,
    channel: 'dealer',
    expiresAt: new Date(Date.now() + 180 * 24 * 3600 * 1000),
    actorId: req.user.id,
  })));
  await AdapterRun.create({ tenantId: application.tenantId, applicationId: application._id, adapter: 'dealer-pos', jurisdiction: customer.jurisdiction, status: 'decided', summary: body.asset.description });
  const { result } = await decideApplication({ application, customer, actor: req.user });
  res.status(201).json({ application, decision: result });
});
