import { ConfigEntry } from '../modules/configuration/model/ConfigEntry.js';
import { Scorecard } from '../modules/scorecards/model/Scorecard.js';
import { Rule } from '../modules/rules/model/Rule.js';
import { Product } from '../modules/products/model/Product.js';
import { Offer, Campaign } from '../modules/engagement/model/Offer.js';
import { DecisionRecord } from '../modules/applications/model/Application.js';
import { resolveLayers } from './configurationEngine.js';
import { evaluateApplication } from './decisionEngine.js';
import { quotePayment } from './money.js';
import { httpError } from '../security/http.js';

const POLICY_KEYS = ['regulatory.dbr', 'pricing.bands', 'doa.matrix', 'fraud.thresholds', 'reason.catalogue', 'islamic.sequences'];

export async function loadPolicy(context) {
  const entries = await ConfigEntry.find({ key: { $in: POLICY_KEYS } }).lean();
  return Object.fromEntries(POLICY_KEYS.map((key) => [key, resolveLayers(entries.filter((entry) => entry.key === key), context)]));
}

export async function activeScorecard(productCode, segment) {
  const cards = await Scorecard.find({ status: 'active' }).lean();
  return cards.find((card) => card.products?.includes(productCode) && (card.segments?.includes(segment) || card.segments?.includes('*')))
    || cards.find((card) => card.products?.includes('*'))
    || null;
}

export function toFeatures(customer, application, product) {
  const useCashflow = product.affordabilityMode === 'cashflow';
  const income = useCashflow ? customer.cashflowMonthly : customer.monthlyIncome;
  const rate = application.indicativeRate || product.baseRate;
  return {
    age: customer.age,
    segment: customer.segment,
    residency: customer.residency,
    employmentType: customer.employmentType,
    kycStatus: application.kycStatus,
    salaryMonths: customer.salaryMonths || 0,
    monthlyIncome: Number(income || 0),
    monthlyObligations: Number(customer.monthlyObligations || 0),
    requestedAmount: Number(application.amount),
    tenorMonths: Number(application.tenorMonths),
    instalment: application.indicativeInstalment || quotePayment(product, application.amount, rate, application.tenorMonths),
    bureauScore: application.bureau?.score ?? customer.bureauScore ?? 0,
    bureauDelinquency: application.bureau?.worstDpd ?? customer.bureauWorstDpd ?? 0,
    writeOff: Boolean(application.bureau?.writeOff),
    relationshipYears: customer.relationshipYears || 0,
    existingExposure: customer.existingExposure || 0,
    cashflowStability: customer.cashflowStability || 0,
    altDataQuality: customer.altDataQuality || 0,
    sanctionsHit: Boolean(application.screening?.sanctions || customer.sanctionsFlag),
    pep: Boolean(application.screening?.pep || customer.pepFlag),
    salaryStopped: Boolean(customer.salaryStopped),
    duplicateApplications: application.duplicateCount || 0,
    deviceRiskScore: application.deviceRiskScore || 0,
    productCode: product.code,
    jurisdiction: application.jurisdiction,
    channel: application.channel,
  };
}

const STATUS = { approve: 'approved', refer: 'referred', decline: 'declined', committee: 'committee' };

export async function decideApplication({ application, customer, actor, type = 'auto', justification = '' }) {
  const product = await Product.findOne({ code: application.productCode }).lean();
  if (!product) throw httpError(404, 'Product is not configured');
  const context = {
    jurisdiction: application.jurisdiction,
    tenantId: application.tenantId,
    entityId: application.branchId,
    segment: customer.segment,
    productCode: product.code,
    channel: application.channel,
  };
  const policy = await loadPolicy(context);
  const scorecard = await activeScorecard(product.code, customer.segment);
  if (!scorecard) throw httpError(409, 'No active scorecard for this product');
  const rules = await Rule.find({ status: 'active', enabled: true }).lean();
  let campaign;
  if (application.offerId) {
    const offer = await Offer.findById(application.offerId).lean();
    if (offer?.campaignId) campaign = await Campaign.findById(offer.campaignId).lean();
  }
  const features = toFeatures(customer, application, product);
  const result = evaluateApplication({
    features,
    product,
    rules,
    scorecard,
    regulatory: policy['regulatory.dbr'].value,
    pricing: policy['pricing.bands'].value,
    doa: policy['doa.matrix'].value,
    fraud: policy['fraud.thresholds'].value,
    reasonCatalogue: policy['reason.catalogue'].value,
    campaign,
  });
  const record = await DecisionRecord.create({
    tenantId: application.tenantId,
    applicationId: application._id,
    type,
    outcome: result.outcome,
    mode: result.mode,
    snapshot: result,
    inputs: features,
    versions: {
      scorecard: { code: scorecard.code, version: scorecard.version },
      regulatory: policy['regulatory.dbr'].chain.map((entry) => ({
        level: entry.scope?.level,
        version: entry.version,
        id: String(entry._id),
      })),
    },
    actorId: actor?.id || '',
    actorName: actor?.name || 'Decision engine',
    justification,
  });
  application.decision = result;
  application.decisionId = record._id;
  application.status = STATUS[result.outcome] || result.outcome;
  application.decidedAt = new Date();
  application.indicativeRate = result.pricing.rate;
  application.indicativeInstalment = result.pricing.instalment;
  if (application.status === 'referred' || application.status === 'committee') {
    const hours = policy['doa.matrix'].value?.slaHours ?? 4;
    const base = application.submittedAt ? new Date(application.submittedAt).getTime() : Date.now();
    application.slaDueAt = new Date(base + hours * 3600 * 1000);
  }
  await application.save();
  return { result, record, product, policy };
}
