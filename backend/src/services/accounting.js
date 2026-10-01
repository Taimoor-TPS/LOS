import crypto from 'crypto';
import { Journal, GLAccount } from '../models/platformModels.js';
import { Counter } from '../modules/applications/model/Application.js';
import { evalAmount, nextSeq } from './common.js';
import { trialBalance } from '../engine/platformEngine.js';
import { httpError } from '../security/http.js';
import { AccountingTemplate } from '../models/platformModels.js';

export async function postEvent(eventCode, context, { session, narration } = {}) {
  const template = await AccountingTemplate.findOne({ eventCode, status: 'ACTIVE', deletedAt: null }).session(session || null).lean();
  if (!template) throw httpError(400, `Accounting template ${eventCode} is not configured`, { code: 'MISSING_TEMPLATE' });
  const lines = [];
  for (const leg of template.legs || []) {
    const amount = evalAmount(leg.amount, context);
    if (!amount) continue;
    lines.push({
      gl: leg.gl,
      name: leg.name || '',
      dr: leg.side === 'DR' ? amount : 0,
      cr: leg.side === 'CR' ? amount : 0,
      productCode: context.productCode || '',
      currency: context.currency || 'PKR',
      branchId: context.branchId || '',
      entityId: context.entityId || 'PK-01',
    });
  }
  if (!lines.length) return null;
  const debit = lines.reduce((sum, line) => sum + line.dr, 0);
  const credit = lines.reduce((sum, line) => sum + line.cr, 0);
  if (debit !== credit) {
    throw httpError(409, `Journal ${eventCode} is not balanced (${debit} vs ${credit})`, { code: 'UNBALANCED' });
  }
  const seq = await nextSeq(Counter, 'journal');
  const reference = `JV${String(seq).padStart(8, '0')}`;
  const [journal] = await Journal.create([{
    reference,
    eventCode,
    entityId: context.entityId || 'PK-01',
    branchId: context.branchId || '',
    productCode: context.productCode || '',
    currency: context.currency || 'PKR',
    valueDate: context.valueDate,
    businessDate: context.businessDate || context.valueDate,
    narration: narration || template.name,
    lines,
    status: 'POSTED',
    makerId: context.actorId || 'system',
  }], { session });
  return journal;
}

export async function glBalance(gl, session) {
  const journals = await Journal.find({ status: 'POSTED' }).session(session || null).lean();
  let net = 0;
  journals.forEach((journal) => {
    (journal.lines || []).forEach((line) => {
      if (line.gl === gl) net += Number(line.dr || 0) - Number(line.cr || 0);
    });
  });
  return net;
}

export async function trialBalanceView() {
  const journals = await Journal.find({ status: 'POSTED' }).lean();
  const accounts = await GLAccount.find({ deletedAt: null }).lean();
  const names = new Map(accounts.map((row) => [row.code, row.name]));
  const shaped = journals.map((journal) => ({
    lines: (journal.lines || []).map((line) => ({ ...line, name: names.get(line.gl) || line.name || line.gl })),
  }));
  return trialBalance(shaped);
}

export function hashPayload(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
