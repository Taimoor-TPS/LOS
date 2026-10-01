import { processingFee, rateCaption } from '../../../engine/money.js';

export function buildKfs({ application, product, customer, decision }) {
  const pricing = decision?.pricing || {};
  const islamic = product.family === 'islamic';
  return {
    title: islamic ? 'Key facts — Islamic financing' : 'Key facts statement',
    illustrative: true,
    disclaimer: 'Illustrative disclosure for this demo. A live bank must publish the regulator template current on the day of the offer.',
    customerName: customer.fullName,
    product: product.name,
    contractType: product.contractType,
    amount: application.amount,
    currency: application.currency || product.currency,
    tenorMonths: application.tenorMonths,
    instalment: pricing.instalment || application.indicativeInstalment,
    rate: pricing.rate || application.indicativeRate,
    rateLabel: rateCaption(product),
    fee: pricing.fee ?? processingFee(application.amount, product),
    totalPayable: pricing.totalPayable,
    totalCost: pricing.totalCost,
    validityDays: decision?.offerValidityDays || 7,
    charityNotIncome: Boolean(product.latePaymentCharity),
    latePayment: product.latePaymentCharity
      ? 'Any late-payment amount is charity and is not recognised as bank income.'
      : 'Late charges follow the schedule in the facility agreement.',
    reasons: (decision?.reasons || []).filter((reason) => reason.customerSafe !== false),
  };
}

export const templates = [
  { code: 'kfs-pk', name: 'Key facts statement', jurisdiction: 'PK', kind: 'disclosure' },
  { code: 'murabaha-sale', name: 'Murabaha sale contract', jurisdiction: 'PK', kind: 'islamic' },
  { code: 'ijarah-lease', name: 'Ijarah lease', jurisdiction: 'PK', kind: 'islamic' },
  { code: 'dm-partnership', name: 'Diminishing Musharakah partnership', jurisdiction: 'PK', kind: 'islamic' },
  { code: 'tawarruq-gcc', name: 'Tawarruq commodity sale', jurisdiction: 'KSA', kind: 'islamic' },
  { code: 'conventional-facility', name: 'Conventional facility agreement', jurisdiction: 'PK', kind: 'conventional' },
];
