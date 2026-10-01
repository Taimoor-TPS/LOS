import { AdapterRun } from '../model/AdapterRun.js';
import { asyncHandler } from '../../../security/http.js';

export const list = asyncHandler(async (req, res) => {
  const runs = await AdapterRun.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({
    catalogue: [
      { code: 'nadra', market: 'Pakistan', purpose: 'Identity' },
      { code: 'ecib', market: 'Pakistan', purpose: 'Bureau' },
      { code: 'raast', market: 'Pakistan', purpose: 'Disbursement' },
      { code: 'nafath', market: 'Saudi Arabia', purpose: 'Identity' },
      { code: 'simah', market: 'Saudi Arabia', purpose: 'Bureau' },
      { code: 'aecb', market: 'UAE', purpose: 'Bureau' },
      { code: 'uae-pass', market: 'UAE', purpose: 'Identity' },
      { code: 'altareq', market: 'UAE', purpose: 'Open finance' },
    ],
    runs,
  });
});
