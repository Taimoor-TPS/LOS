import { ModelCard } from '../model/ModelCard.js';
import { asyncHandler } from '../../../security/http.js';

export const list = asyncHandler(async (req, res) => {
  const cards = await ModelCard.find().lean();
  res.json({ models: cards });
});
