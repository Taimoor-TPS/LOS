import { z } from 'zod';
import { Scheme } from '../model/Scheme.js';
import { parse } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../security/http.js';

export const list = asyncHandler(async (req, res) => {
  const schemes = await Scheme.find().lean();
  res.json({ schemes });
});

export const create = asyncHandler(async (req, res) => {
  const body = parse(z.object({
    code: z.string(),
    name: z.string(),
    authority: z.string(),
    jurisdiction: z.string(),
    productCodes: z.array(z.string()),
    coveragePercent: z.number(),
    maxAmount: z.number(),
    eligibilityNote: z.string(),
    reportingCode: z.string(),
  }), req.body);
  const scheme = await Scheme.create({ ...body, illustrative: true });
  res.status(201).json({ scheme });
});
