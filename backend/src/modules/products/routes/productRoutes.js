import { Router } from 'express';
import { requireAuth, requirePermission, requireStaffOrCustomer } from '../../../security/auth.js';
import { create, getOne, list, quote, update } from '../controller/productController.js';
import { asyncHandler, httpError } from '../../../security/http.js';
import { Product } from '../model/Product.js';
import { ProductVersion } from '../../../models/platformModels.js';
import { writeAudit } from '../../../security/audit.js';
import { checkSoD } from '../../../security/rbac.js';
import { buildSchedule, pmt, annualPercentageRate } from '../../../engine/platformEngine.js';
import { assertVersion, bump } from '../../../services/common.js';

const router = Router();
router.use(requireAuth);

router.get('/', requireStaffOrCustomer('product:view'), list);
router.post('/', requirePermission('product:create'), create);
router.post('/quote', requireStaffOrCustomer('product:view'), quote);

router.patch('/:code/draft', requirePermission('product:edit'), asyncHandler(async (req, res) => {
  const product = await Product.findOne({ $or: [{ code: req.params.code }, { _id: req.params.code }] });
  if (!product) throw httpError(404, 'Product not found');
  if (!['DRAFT', 'draft', 'active'].includes(product.status) && product.status !== 'DRAFT') {
    if (product.status === 'PUBLISHED') throw httpError(409, 'Published products are changed by creating a new version');
  }
  assertVersion(product, req.body.version);
  const { version, step, ...rest } = req.body;
  Object.assign(product, rest);
  if (step) product.draftStep = step;
  if (rest.amount) {
    product.minAmount = rest.amount.min;
    product.maxAmount = rest.amount.max;
    product.amountStep = rest.amount.step;
  }
  if (rest.tenor) {
    product.minTenor = rest.tenor.min;
    product.maxTenor = rest.tenor.max;
    product.tenorStep = rest.tenor.step;
  }
  if (rest.pricing?.floor != null) product.baseRate = rest.pricing.floor;
  product.status = 'DRAFT';
  bump(product);
  await product.save();
  res.json({ product });
}));

router.post('/:code/simulate', requirePermission('product:view'), asyncHandler(async (req, res) => {
  const product = await Product.findOne({ $or: [{ code: req.params.code }, { _id: req.params.code }] }).lean();
  if (!product) throw httpError(404, 'Product not found');
  const amount = Number(req.body.amount || product.minAmount || 100000);
  const tenor = Number(req.body.tenorMonths || product.minTenor || 12);
  const rate = Number(product.baseRate || 0.2);
  const schedule = buildSchedule({ principal: amount, annualRate: rate, tenorMonths: tenor });
  const fee = Math.round(amount * Number(product.feeRate || 0));
  res.json({
    kfs: {
      amount, tenor, rate, instalment: schedule.instalment,
      apr: annualPercentageRate({ netDisbursed: amount - fee, instalment: schedule.instalment, tenorMonths: tenor }),
      fee, totalPayable: schedule.instalment * tenor, schedule: schedule.lines,
    },
  });
}));

router.post('/:code/submit', requirePermission('product:edit'), asyncHandler(async (req, res) => {
  const product = await Product.findOne({ $or: [{ code: req.params.code }, { _id: req.params.code }] });
  if (!product) throw httpError(404, 'Product not found');
  product.status = 'PENDING_APPROVAL';
  product.makerId = req.user.id;
  bump(product);
  await product.save();
  res.json({ product });
}));

router.post('/:code/approve', requirePermission('product:publish'), asyncHandler(async (req, res) => {
  const product = await Product.findOne({ $or: [{ code: req.params.code }, { _id: req.params.code }] });
  if (!product) throw httpError(404, 'Product not found');
  const sod = await checkSoD(req.user, 'product:publish', { makerId: product.makerId || product.createdBy }, { reason: req.body.reason });
  product.status = 'PENDING_APPROVAL';
  product.checkerId = req.user.id;
  product.selfAuthorised = Boolean(sod.selfAuthorised);
  bump(product);
  await product.save();
  await writeAudit(req, { action: 'approve', resource: 'product', resourceId: product._id, reason: req.body.reason || '' });
  res.json({ product });
}));

router.post('/:code/publish', requirePermission('product:publish'), asyncHandler(async (req, res) => {
  const product = await Product.findOne({ $or: [{ code: req.params.code }, { _id: req.params.code }] });
  if (!product) throw httpError(404, 'Product not found');
  const version = Number(product.version || 1);
  await ProductVersion.create({ productId: product._id, code: product.code, version, snapshot: product.toObject(), publishedAt: new Date() });
  product.status = 'PUBLISHED';
  product.effectiveFrom = new Date();
  bump(product);
  await product.save();
  await writeAudit(req, { action: 'publish', resource: 'product', resourceId: product._id, detail: { version } });
  res.json({ product });
}));

router.post('/:code/retire', requirePermission('product:retire'), asyncHandler(async (req, res) => {
  const product = await Product.findOne({ code: req.params.code });
  if (!product) throw httpError(404, 'Product not found');
  product.status = 'RETIRED';
  product.deletedAt = new Date();
  product.deletedBy = req.user.id;
  product.effectiveTo = new Date();
  await product.save();
  res.json({ product });
}));

router.get('/:code/versions', requirePermission('product:view'), asyncHandler(async (req, res) => {
  const product = await Product.findOne({ code: req.params.code }).lean();
  const items = await ProductVersion.find({ $or: [{ code: req.params.code }, { productId: product?._id }] }).sort({ version: -1 }).lean();
  res.json({ items });
}));

router.get('/:code', requireStaffOrCustomer('product:view'), getOne);
router.patch('/:code', requirePermission('product:edit'), update);

export default router;
