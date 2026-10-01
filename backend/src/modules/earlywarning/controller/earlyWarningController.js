import { EarlyWarning } from '../model/EarlyWarning.js';
import { Customer } from '../../customers/model/Customer.js';
import { asyncHandler, httpError } from '../../../security/http.js';

export const list = asyncHandler(async (req, res) => {
  const signals = await EarlyWarning.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 }).lean();
  const customers = await Customer.find({ _id: { $in: signals.map((signal) => signal.customerId) } }).lean();
  const names = new Map(customers.map((customer) => [String(customer._id), customer.fullName]));
  res.json({ signals: signals.map((signal) => ({ ...signal, customerName: names.get(String(signal.customerId)) })) });
});

export const acknowledge = asyncHandler(async (req, res) => {
  const signal = await EarlyWarning.findById(req.params.id);
  if (!signal) throw httpError(404, 'Signal not found');
  signal.status = 'acknowledged';
  signal.acknowledgedBy = req.user.name;
  signal.acknowledgedAt = new Date();
  await signal.save();
  res.json({ signal });
});
