import { maxPrincipal } from './money.js';
import { assessAffordability } from './affordability.js';

export function propensityScore(customer, weights = {}) {
  let score = 0;
  if ((customer.salaryMonths || 0) >= 12) score += weights.stableIncome ?? 28;
  if ((customer.lifeEvents || []).length) score += weights.lifeEvent ?? 18;
  if ((customer.simulatorViews || 0) > 0) score += weights.intent ?? 16;
  if ((customer.relationshipYears || 0) >= 2) score += weights.relationship ?? 12;
  if (customer.segment === 'thin_file' && (customer.altDataQuality || 0) >= 60) score += weights.altData ?? 20;
  if ((customer.onTimePayments || 0) >= 6) score += weights.repayment ?? 14;
  return Math.min(100, score);
}

export function safeLimit({ income, obligations, regulatory, rate, tenor, productMax }) {
  const mode = regulatory.mode || 'dbr';
  if (mode === 'cashflow') {
    const minCover = regulatory.minCashflowCover ?? 1.5;
    const payment = income / minCover;
    return Math.min(productMax, maxPrincipal(payment, rate, tenor));
  }
  const maxDbr = regulatory.maxDbr ?? 0.4;
  const room = income * maxDbr - obligations;
  if (room <= 0) return 0;
  return Math.min(productMax, maxPrincipal(room, rate, tenor));
}

export function identifyProspect({ customer, products, regulatory, propensityCutoff = 40, frequency }) {
  const reasons = [];
  if (customer.salaryStopped) {
    return { eligible: false, reasons: ['SALARY_STOP'], propensity: 0, offers: [], contact: false };
  }
  if (customer.sanctionsFlag) {
    return { eligible: false, reasons: ['FRAUD_SANCTIONS'], propensity: 0, offers: [], contact: false };
  }
  const propensity = propensityScore(customer);
  if (propensity < propensityCutoff) reasons.push('LOW_PROPENSITY');
  const contact = !customer.holdout
    && !customer.marketingRevoked
    && (customer.contactsLast7Days || 0) < (frequency?.maxContactsPer7Days ?? 2);

  const offers = [];
  if (contact && propensity >= propensityCutoff) {
    for (const product of products) {
      if (product.jurisdiction !== customer.jurisdiction) continue;
      if (product.segments?.length && !product.segments.includes(customer.segment)) continue;
      const limit = safeLimit({
        income: product.affordabilityMode === 'cashflow' ? customer.cashflowMonthly : customer.monthlyIncome,
        obligations: customer.monthlyObligations,
        regulatory: { ...regulatory, mode: product.affordabilityMode },
        rate: product.baseRate,
        tenor: Math.min(36, product.maxTenor),
        productMax: product.maxAmount,
      });
      const affordability = assessAffordability({
        income: product.affordabilityMode === 'cashflow' ? customer.cashflowMonthly : customer.monthlyIncome,
        obligations: customer.monthlyObligations,
        instalment: 1,
        regulatory,
        mode: product.affordabilityMode || 'dbr',
      });
      if (limit >= product.minAmount && (affordability.pass || limit > 0)) {
        offers.push({
          productCode: product.code,
          limit: Math.max(product.minAmount, Math.round(limit)),
          propensity,
          tenorMonths: Math.min(36, product.maxTenor),
        });
      }
    }
  }

  return {
    eligible: offers.length > 0,
    propensity,
    reasons,
    contact,
    holdout: Boolean(customer.holdout),
    offers: offers.sort((a, b) => b.limit - a.limit).slice(0, 3),
  };
}
