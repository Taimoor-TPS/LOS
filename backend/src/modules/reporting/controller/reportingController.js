import { Application } from '../../applications/model/Application.js';
import { Offer } from '../../engagement/model/Offer.js';
import { LoanAccount } from '../../servicing/model/LoanAccount.js';
import { EarlyWarning } from '../../earlywarning/model/EarlyWarning.js';
import { asyncHandler } from '../../../security/http.js';

export const commandCenter = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const applications = await Application.find({ tenantId }).lean();
  const decided = applications.filter((item) => item.decidedAt);
  const approved = applications.filter((item) => ['approved', 'accepted', 'signed', 'pending_fulfilment', 'disbursed', 'pending_second_approval'].includes(item.status));
  const stp = applications.filter((item) => item.decision?.mode === 'stp' && item.status === 'disbursed');
  const tatHours = decided
    .map((item) => (new Date(item.decidedAt) - new Date(item.submittedAt || item.createdAt)) / 36e5)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const avgTat = tatHours.length ? tatHours.reduce((sum, value) => sum + value, 0) / tatHours.length : 0;
  const byStatus = applications.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), {});
  const reasons = {};
  for (const item of applications) {
    for (const reason of item.decision?.reasons || []) {
      if (['APPROVE_CAPACITY', 'APPROVE_STABILITY', 'APPROVE_BUREAU'].includes(reason.code)) continue;
      reasons[reason.code] = (reasons[reason.code] || 0) + 1;
    }
  }
  const offers = await Offer.find({ tenantId }).lean();
  const loans = await LoanAccount.countDocuments({ tenantId });
  const warnings = await EarlyWarning.countDocuments({ tenantId, status: 'open' });
  const pipeline = applications
    .filter((item) => !['declined', 'disbursed'].includes(item.status))
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  res.json({
    applications: applications.length,
    approvalRate: decided.length ? approved.length / decided.length : 0,
    stpRate: approved.length ? stp.length / approved.length : 0,
    avgTatHours: Math.round(avgTat * 10) / 10,
    byStatus,
    declineReasons: reasons,
    offers: { issued: offers.length, viewed: offers.filter((offer) => offer.viewedAt).length, converted: offers.filter((offer) => offer.status === 'converted').length },
    loans,
    openWarnings: warnings,
    pipeline,
  });
});
