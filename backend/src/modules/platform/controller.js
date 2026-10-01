import { asyncHandler, httpError } from '../../security/http.js';
import { decisionOutcome, eligibilityResult, identityFromId, scoreBand } from '../../engine/platformEngine.js';
import {
  accountingView,
  addComplaint,
  approveApplication,
  approveDeviation,
  collectionsView,
  getLoan,
  listComplaints,
  listLoans,
  logCollectionAction,
  overview,
  platformState,
  postRepayment,
  proposeSettlement,
  provisioningView,
  quoteCalculator,
  runEod,
  searchPlatform,
  setBackOfficeUsers,
  settlementQuote,
  simulateProduct,
  retireField,
} from './store.js';

function fail(error) {
  const wrapped = httpError(error.status || 500, error.message);
  const details = {};
  if (error.deviations) details.deviations = error.deviations;
  if (error.impact) details.impact = error.impact;
  if (Object.keys(details).length) wrapped.details = details;
  return wrapped;
}

export const getOverview = asyncHandler(async (req, res) => {
  res.json(overview());
});

export const getLoans = asyncHandler(async (req, res) => {
  res.json({ loans: listLoans(), businessDate: platformState().businessDate });
});

export const getLoanAccount = asyncHandler(async (req, res) => {
  const loan = getLoan(req.params.accountNo);
  if (!loan) throw httpError(404, 'Loan account not found');
  res.json({ loan });
});

export const payLoan = asyncHandler(async (req, res) => {
  try {
    const receipt = postRepayment({
      loanAccountNo: req.body.loanAccountNo,
      amount: req.body.amount,
      method: req.body.method,
      idempotencyKey: req.body.idempotencyKey,
    });
    res.status(201).json({ receipt });
  } catch (error) {
    throw fail(error);
  }
});

export const quoteSettlement = asyncHandler(async (req, res) => {
  const quote = settlementQuote(req.params.accountNo, req.body?.settlementDate, req.body || {});
  if (!quote) throw httpError(404, 'Loan account not found');
  res.json({ quote });
});

export const postEod = asyncHandler(async (req, res) => {
  try {
    res.json(runEod());
  } catch (error) {
    throw fail(error);
  }
});

export const getAccounting = asyncHandler(async (req, res) => {
  res.json(accountingView());
});

export const getProvisioning = asyncHandler(async (req, res) => {
  res.json(provisioningView());
});

export const getCollections = asyncHandler(async (req, res) => {
  res.json(collectionsView());
});

export const postCollectionAction = asyncHandler(async (req, res) => {
  const result = logCollectionAction(req.params.caseId, req.body || {});
  if (!result) throw httpError(404, 'Collection case not found');
  res.status(201).json(result);
});

export const postSettlement = asyncHandler(async (req, res) => {
  try {
    const settlement = proposeSettlement(req.params.caseId, req.body || {});
    if (!settlement) throw httpError(404, 'Collection case not found');
    res.status(201).json({ settlement });
  } catch (error) {
    throw fail(error);
  }
});

export const postUsersMode = asyncHandler(async (req, res) => {
  res.json(setBackOfficeUsers(Number(req.body.count) === 2 ? 2 : 1));
});

export const postDecision = asyncHandler(async (req, res) => {
  try {
    res.json(approveApplication(req.body.applicationNo));
  } catch (error) {
    throw fail(error);
  }
});

export const postDeviation = asyncHandler(async (req, res) => {
  try {
    const deviation = approveDeviation(req.params.id, req.body.justification);
    if (!deviation) throw httpError(404, 'Deviation not found');
    res.json({ deviation });
  } catch (error) {
    throw fail(error);
  }
});

export const postRetireField = asyncHandler(async (req, res) => {
  try {
    res.json(retireField(req.body.fieldCode));
  } catch (error) {
    throw fail(error);
  }
});

export const postSimulate = asyncHandler(async (req, res) => {
  res.json({ simulation: simulateProduct(req.body || {}) });
});

export const getSearch = asyncHandler(async (req, res) => {
  res.json({ matches: searchPlatform(req.query.q) });
});

export const postEligibility = asyncHandler(async (req, res) => {
  const identity = identityFromId(req.body.idNumber);
  if (req.body.guarantor && !req.body.guarantorConsent) {
    throw httpError(409, 'No bureau call was made. The guarantor has no active bureau consent.');
  }
  const result = eligibilityResult({
    ...req.body,
    writeOffHit: identity.flag === 'WRITE_OFF_HIT',
    sanctionsPotential: identity.flag === 'SANCTIONS_POTENTIAL',
    cardStatus: identity.cardStatus,
  });
  const scored = scoreBand(req.body.score || 690);
  let decision;
  if (identity.flag === 'SANCTIONS_POTENTIAL') decision = { outcome: 'REFER', reason: 'Compliance review' };
  else if (identity.flag === 'WRITE_OFF_HIT' || identity.cardStatus !== 'VALID') decision = { outcome: 'AUTO_DECLINE', reason: 'Knock-out' };
  else {
    decision = decisionOutcome({
      knockOut: !result.eligible,
      bureau: identity.bureau === 'clear' ? 'clear' : 'minor',
      dbrWithinCap: result.dbr == null || result.dbr <= result.dbrCap,
      band: scored.band,
      deviations: false,
      bureauUnavailable: false,
    });
  }
  res.json({ identity, eligibility: result, score: scored, decision });
});

export const postComplaint = asyncHandler(async (req, res) => {
  if (!req.body.subject) throw httpError(400, 'A subject is required');
  res.status(201).json({ complaint: addComplaint(req.body) });
});

export const getComplaints = asyncHandler(async (req, res) => {
  res.json({ complaints: listComplaints() });
});

export const postCalculate = asyncHandler(async (req, res) => {
  res.json(quoteCalculator(req.body || {}));
});

export const getDeviations = asyncHandler(async (req, res) => {
  res.json({ deviations: platformState().deviations, users: platformState().backOfficeUsers });
});
