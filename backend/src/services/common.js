import { httpError } from '../security/http.js';

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function listArgs(query, { searchFields = [] } = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const filter = { deletedAt: null };
  const raw = query.filter || {};
  Object.entries(raw).forEach(([key, value]) => {
    if (value !== undefined && value !== '') filter[key] = value;
  });
  if (query.q && searchFields.length) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = searchFields.map((field) => ({ [field]: rx }));
  }
  let sort = { createdAt: -1 };
  if (query.sort) {
    const field = String(query.sort);
    const desc = field.startsWith('-');
    sort = { [desc ? field.slice(1) : field]: desc ? -1 : 1 };
  }
  return { page, pageSize, filter, sort, skip: (page - 1) * pageSize };
}

export function pageResult(items, page, pageSize, total) {
  return { items, page, pageSize, total };
}

export function assertVersion(doc, version) {
  if (version === undefined || version === null || version === '') return;
  if (Number(doc.version || 1) !== Number(version)) {
    throw httpError(409, 'This record was updated by someone else. Reload and try again.', { code: 'VERSION_CONFLICT' });
  }
}

export function bump(doc) {
  doc.version = Number(doc.version || 1) + 1;
}

export function addDays(iso, days) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function isMonthEnd(iso) {
  return addDays(iso, 1).slice(5, 7) !== String(iso).slice(5, 7);
}

export function evalAmount(expr, ctx) {
  if (typeof expr === 'number') return Math.round(expr);
  const src = String(expr ?? '0').trim();
  if (!src) return 0;
  const replaced = src.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (name) => String(Number(ctx[name]) || 0));
  if (!/^[-+*/().\d\s]+$/.test(replaced)) {
    throw httpError(400, `Amount expression is not allowed: ${expr}`);
  }
  const value = Function(`"use strict"; return (${replaced})`)();
  return Math.round(Number(value) || 0);
}

export async function nextSeq(Counter, key) {
  const counter = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return counter.seq;
}
