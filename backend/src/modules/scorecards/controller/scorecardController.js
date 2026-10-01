import { z } from 'zod';
import { Scorecard } from '../model/Scorecard.js';
import { Customer } from '../../customers/model/Customer.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { writeAudit } from '../../../security/audit.js';
import { scoreApplication } from '../../../engine/scoreboard.js';
import { CHECKER_ROLES } from '../../../security/roles.js';

const factor = z.object({
  key: z.string(),
  label: z.string(),
  weight: z.number(),
  bands: z.array(z.object({ min: z.number(), max: z.number().optional(), points: z.number() })),
});

function weightSum(factors) {
  return factors.reduce((sum, item) => sum + Number(item.weight || 0), 0);
}

export const list = asyncHandler(async (req, res) => {
  const cards = await Scorecard.find().sort({ code: 1, version: -1 }).lean();
  res.json({ scorecards: cards });
});

export const create = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    code: z.string(),
    name: z.string(),
    products: z.array(z.string()),
    segments: z.array(z.string()),
    factors: z.array(factor).min(1),
    approveCutoff: z.number(),
    referCutoff: z.number(),
    comment: z.string().optional(),
  }), req.body);
  const latest = await Scorecard.findOne({ code: body.code }).sort({ version: -1 }).lean();
  const card = await Scorecard.create({
    ...body,
    version: (latest?.version || 0) + 1,
    status: 'draft',
    champion: false,
    makerId: req.user.id,
    makerName: req.user.name,
    pd: { midpoint: 50, slope: 8 },
  });
  res.status(201).json({ scorecard: card });
});

export const submit = asyncHandler(async (req, res) => {
  const card = await Scorecard.findById(req.params.id);
  if (!card) throw httpError(404, 'Scorecard not found');
  if (Math.abs(weightSum(card.factors) - 100) > 0.2) throw httpError(400, 'Weights must add up to 100 before submission');
  if (card.referCutoff >= card.approveCutoff) throw httpError(400, 'Refer cut-off must be below the approve cut-off');
  card.status = 'pending_approval';
  await card.save();
  res.json({ scorecard: card });
});

export const approve = asyncHandler(async (req, res) => {
  const card = await Scorecard.findById(req.params.id);
  if (!card) throw httpError(404, 'Scorecard not found');
  if (!CHECKER_ROLES.includes(req.user.role)) throw httpError(403, 'Your role cannot approve a scorecard');
  if (card.makerId === req.user.id) throw httpError(403, 'Maker cannot approve their own scorecard');
  await Scorecard.updateMany({ code: card.code, status: 'active' }, { status: 'retired', champion: false });
  card.status = 'active';
  card.champion = true;
  card.checkerId = req.user.id;
  card.checkerName = req.user.name;
  await card.save();
  await writeAudit(req, { action: 'scorecard_approve', resource: 'scorecard', resourceId: card._id, detail: { code: card.code, version: card.version } });
  res.json({ scorecard: card });
});

export const simulate = asyncHandler(async (req, res) => {
  const card = await Scorecard.findById(req.params.id).lean();
  if (!card) throw httpError(404, 'Scorecard not found');
  const body = parse(z.object({ customerId: z.string().optional(), features: z.record(z.string(), z.number()).optional() }), req.body);
  let features = body.features || {};
  if (body.customerId) {
    const customer = await Customer.findById(body.customerId).lean();
    if (!customer) throw httpError(404, 'Customer not found');
    features = {
      bureauScore: customer.bureauScore || 0,
      capacityScore: 70,
      salaryMonths: customer.salaryMonths || 0,
      relationshipYears: customer.relationshipYears || 0,
      cashflowStability: customer.cashflowStability || 0,
      altDataQuality: customer.altDataQuality || 0,
      cleanFile: 100,
      ...features,
    };
  }
  res.json({ result: scoreApplication(card, features), features });
});
