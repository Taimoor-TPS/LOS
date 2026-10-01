import { processingFee, quotePayment } from './money.js';
import { scoreApplication } from './scoreboard.js';
import { assessAffordability, capacityFeature } from './affordability.js';
import { priceFacility } from './pricingEngine.js';
import { runStage } from './rulesEngine.js';
import { customerReason } from './reasonCodes.js';

export function parameterChecks(features, regulatory, product) {
  const fired = [];
  const decline = (reasonCode, name) => fired.push({ code: reasonCode, name, reasonCode, outcome: 'decline', stop: false });
  const minAge = product.minAge ?? regulatory.minAge ?? 21;
  const maxAge = product.maxAge ?? regulatory.maxAge ?? 65;
  if (features.age < minAge || features.age > maxAge) decline('ELIG_AGE', 'Age band');
  const maturityCap = product.maxAgeAtMaturity ?? regulatory.maxAgeAtMaturity;
  if (maturityCap && features.tenorMonths && features.age + features.tenorMonths / 12 > maturityCap) {
    decline('ELIG_AGE_MATURITY', 'Age at maturity');
  }
  if (product.minIncome && product.affordabilityMode !== 'cashflow' && features.monthlyIncome < product.minIncome) {
    decline('ELIG_INCOME', 'Minimum income');
  }
  if (features.kycStatus !== 'verified') decline('ELIG_KYC', 'KYC');
  if (features.requestedAmount < product.minAmount || features.requestedAmount > product.maxAmount) decline('ELIG_AMOUNT', 'Amount band');
  if (features.tenorMonths < product.minTenor || features.tenorMonths > product.maxTenor) decline('ELIG_TENOR', 'Tenor band');
  if (product.employment?.length && !product.employment.includes(features.employmentType)) decline('ELIG_EMPLOYMENT', 'Employment');
  if (features.bureauDelinquency > (regulatory.maxDpd ?? 90)) decline('ELIG_DELINQUENCY', 'Delinquency');
  if (features.writeOff) decline('ELIG_WRITEOFF', 'Write-off');
  if (features.residency === 'non_resident' && regulatory.allowNonResident === false && product.allowExpat !== true) {
    decline('ELIG_RESIDENCY', 'Residency');
  }
  return fired;
}

export function fraudChecks(features, fraud = {}) {
  const fired = [];
  if (features.sanctionsHit) fired.push({ code: 'SANCTIONS', name: 'Sanctions', reasonCode: 'FRAUD_SANCTIONS', outcome: 'decline', stop: true });
  if (features.salaryStopped) fired.push({ code: 'SALARY_STOP', name: 'Salary stop', reasonCode: 'SALARY_STOP', outcome: 'decline', stop: true });
  const duplicateDecline = fraud.duplicateDecline ?? 4;
  const duplicateRefer = fraud.duplicateRefer ?? 2;
  if (features.duplicateApplications >= duplicateDecline) {
    fired.push({ code: 'DUPLICATE', name: 'Duplicate applications', reasonCode: 'FRAUD_DUPLICATE', outcome: 'decline', stop: true });
  } else if (features.duplicateApplications >= duplicateRefer) {
    fired.push({ code: 'DUPLICATE', name: 'Duplicate applications', reasonCode: 'FRAUD_DUPLICATE', outcome: 'refer', stop: false });
  }
  if (features.deviceRiskScore >= (fraud.deviceReferScore ?? 70)) {
    fired.push({ code: 'DEVICE', name: 'Device risk', reasonCode: 'FRAUD_DEVICE', outcome: 'refer', stop: false });
  }
  if (features.pep) {
    fired.push({ code: 'PEP', name: 'PEP', reasonCode: 'PEP_REVIEW', outcome: fraud.pepOutcome || 'refer', stop: false });
  }
  return fired;
}

function pushReason(list, code) {
  if (code && !list.includes(code)) list.push(code);
}

export function evaluateApplication(input) {
  const {
    features,
    product,
    rules = [],
    scorecard,
    regulatory = {},
    pricing = {},
    doa = {},
    fraud = {},
    reasonCatalogue,
    campaign,
  } = input;

  const eligibility = [...parameterChecks(features, regulatory, product), ...runStage(rules, 'eligibility', features)];
  const fraudFired = [...fraudChecks(features, fraud), ...runStage(rules, 'fraud', features)];
  const policy = runStage(rules, 'policy', features);

  const affordability = assessAffordability({
    income: features.monthlyIncome,
    obligations: features.monthlyObligations,
    instalment: features.instalment,
    regulatory,
    mode: product.affordabilityMode || 'dbr',
  });

  const scored = scoreApplication(scorecard, {
    ...features,
    capacityScore: capacityFeature(affordability),
    cleanFile: features.sanctionsHit || features.writeOff || features.bureauDelinquency > 30 ? 0 : 100,
  });

  const priced = priceFacility({ product, score: scored.score, features, pricing, campaign });
  const finalInstalment = quotePayment(product, features.requestedAmount, priced.rate, features.tenorMonths);
  const exposureTotal = features.existingExposure + features.requestedAmount;
  const cap = doa.groupExposureCap ?? regulatory.groupExposureCap ?? 25000000;
  const exposureOk = exposureTotal <= cap;

  const hardDecline = [...eligibility, ...fraudFired, ...policy].filter((item) => item.outcome === 'decline');
  const refers = [...eligibility, ...fraudFired, ...policy].filter((item) => item.outcome === 'refer');
  const reasons = [];
  let outcome = 'approve';
  let mode = 'stp';

  if (hardDecline.length) {
    outcome = 'decline';
    mode = 'auto';
    hardDecline.forEach((item) => pushReason(reasons, item.reasonCode));
  } else if (!affordability.pass) {
    outcome = affordability.near ? 'refer' : 'decline';
    mode = outcome === 'refer' ? 'manual' : 'auto';
    pushReason(reasons, product.affordabilityMode === 'cashflow' ? 'CASHFLOW_COVER' : 'DBR_CAP');
  } else if (!exposureOk) {
    outcome = 'refer';
    mode = 'manual';
    pushReason(reasons, 'EXPOSURE_CAP');
  } else if (scored.band === 'decline') {
    outcome = 'decline';
    mode = 'auto';
    pushReason(reasons, 'SCORE_LOW');
  } else if (scored.band === 'refer' || refers.length) {
    outcome = 'refer';
    mode = 'manual';
    pushReason(reasons, 'SCORE_REFER');
    refers.forEach((item) => pushReason(reasons, item.reasonCode));
  } else {
    pushReason(reasons, 'APPROVE_CAPACITY');
    if (features.salaryMonths >= 12) pushReason(reasons, 'APPROVE_STABILITY');
    if (features.bureauScore >= 700) pushReason(reasons, 'APPROVE_BUREAU');
    refers.forEach((item) => {
      outcome = 'refer';
      mode = 'manual';
      pushReason(reasons, item.reasonCode);
    });
  }

  const amount = features.requestedAmount;
  const stpLimit = product.stpLimit ?? doa.stpLimit ?? 1500000;
  const committeeAbove = doa.committeeAbove ?? 5000000;
  if (outcome === 'approve' && amount > stpLimit) {
    outcome = 'refer';
    mode = 'manual';
    pushReason(reasons, 'DOA_ABOVE_STP');
  }
  if (outcome !== 'decline' && amount > committeeAbove) {
    outcome = 'committee';
    mode = 'committee';
    pushReason(reasons, 'DOA_COMMITTEE');
  }

  const fee = processingFee(amount, product);
  const lgd = product.lgd ?? 0.45;
  return {
    outcome,
    mode,
    reasons: reasons.map((code) => ({ code, ...customerReason(code, reasonCatalogue) })),
    score: scored,
    affordability,
    pricing: {
      ...priced,
      instalment: finalInstalment,
      totalPayable: finalInstalment * features.tenorMonths,
      fee,
      totalCost: finalInstalment * features.tenorMonths - amount + fee,
    },
    exposure: { existing: features.existingExposure, requested: amount, total: exposureTotal, cap, ok: exposureOk },
    ifrs9: { pd: scored.pd, lgd, ead: amount, ecl: Math.round(scored.pd * lgd * amount) },
    rulesFired: { eligibility, fraud: fraudFired, policy },
    offerValidityDays: regulatory.offerValidityDays ?? 7,
  };
}
