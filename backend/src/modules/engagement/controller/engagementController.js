import { z } from 'zod';
import { Campaign, Offer } from '../model/Offer.js';
import { Customer } from '../../customers/model/Customer.js';
import { Product } from '../../products/model/Product.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { writeAudit } from '../../../security/audit.js';
import { identifyProspect } from '../../../engine/prospectEngine.js';
import { loadPolicy } from '../../../engine/decisionService.js';
import { ROLES } from '../../../security/roles.js';

export const myOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({ customerId: req.user.customerId, status: { $in: ['issued', 'viewed'] }, holdout: false }).sort({ limit: -1 }).lean();
  const products = await Product.find({ code: { $in: offers.map((offer) => offer.productCode) } }).lean();
  const byCode = new Map(products.map((product) => [product.code, product]));
  res.json({ offers: offers.map((offer) => ({ ...offer, product: byCode.get(offer.productCode) || null })) });
});

export const viewOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findOne({ _id: req.params.id, customerId: req.user.customerId });
  if (!offer) throw httpError(404, 'Offer not found');
  if (!offer.viewedAt) offer.viewedAt = new Date();
  if (offer.status === 'issued') offer.status = 'viewed';
  await offer.save();
  res.json({ offer });
});

export const listCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await Campaign.find({ tenantId: req.user.tenantId }).sort({ updatedAt: -1 }).lean();
  res.json({ campaigns });
});

export const createCampaign = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    name: z.string().min(3),
    segment: z.string(),
    channel: z.string(),
    productCode: z.string(),
    message: z.string().min(3),
    discountRate: z.number().min(0).max(0.03).default(0),
  }), req.body);
  const campaign = await Campaign.create({ ...body, tenantId: req.user.tenantId, status: 'active' });
  await writeAudit(req, { action: 'campaign_create', resource: 'campaign', resourceId: campaign._id });
  res.status(201).json({ campaign });
});

export const runCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw httpError(404, 'Campaign not found');
  const customers = await Customer.find({ tenantId: campaign.tenantId, segment: campaign.segment }).lean();
  const product = await Product.findOne({ code: campaign.productCode }).lean();
  if (!product) throw httpError(404, 'Product not found');
  let issued = 0;
  let held = 0;
  let skipped = 0;
  for (const customer of customers) {
    const policy = await loadPolicy({
      jurisdiction: customer.jurisdiction,
      tenantId: customer.tenantId,
      segment: customer.segment,
      productCode: product.code,
      channel: campaign.channel,
      entityId: customer.branchId,
    });
    const prospect = identifyProspect({
      customer,
      products: [product],
      regulatory: policy['regulatory.dbr'].value,
      frequency: { maxContactsPer7Days: campaign.frequencyCap },
    });
    if (customer.holdout || !prospect.contact) {
      held += customer.holdout ? 1 : 0;
      skipped += customer.holdout ? 0 : 1;
      continue;
    }
    const offer = prospect.offers[0];
    if (!offer) {
      skipped += 1;
      continue;
    }
    await Offer.create({
      tenantId: customer.tenantId,
      customerId: customer._id,
      productCode: product.code,
      campaignId: campaign._id,
      limit: offer.limit,
      tenorMonths: offer.tenorMonths,
      propensity: prospect.propensity,
      channel: campaign.channel,
      message: campaign.message,
      validUntil: new Date(Date.now() + 14 * 24 * 3600 * 1000),
    });
    issued += 1;
  }
  campaign.lastRun = { at: new Date(), issued, held, skipped, by: req.user.name };
  await campaign.save();
  await writeAudit(req, { action: 'campaign_run', resource: 'campaign', resourceId: campaign._id, detail: campaign.lastRun });
  res.json({ campaign, result: campaign.lastRun });
});

export const listOffers = asyncHandler(async (req, res) => {
  const offers = await Offer.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ offers });
});
