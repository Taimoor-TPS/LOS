export const SCOPE_RANK = {
  system: 0,
  jurisdiction: 1,
  tenant: 2,
  entity: 3,
  segment: 4,
  product: 5,
  channel: 6,
};

export function deepMerge(base, override) {
  if (Array.isArray(override)) return override.slice();
  if (
    override &&
    typeof override === 'object' &&
    base &&
    typeof base === 'object' &&
    !Array.isArray(base)
  ) {
    const out = { ...base };
    for (const [k, v] of Object.entries(override)) {
      out[k] = Object.prototype.hasOwnProperty.call(base, k) ? deepMerge(base[k], v) : v;
    }
    return out;
  }
  return override === undefined ? base : override;
}

export function scopeIdentity(scope = {}) {
  return [
    scope.level || 'system',
    scope.jurisdiction || '',
    scope.tenantId || '',
    scope.entityId || '',
    scope.segment || '',
    scope.productCode || '',
    scope.channel || '',
  ].join('|');
}

export function scopeMatches(scope = {}, context = {}) {
  const level = scope.level || 'system';
  if (level === 'system') return true;
  if (level === 'jurisdiction') return scope.jurisdiction === context.jurisdiction;
  if (level === 'tenant') return scope.tenantId === context.tenantId;
  if (level === 'entity') return scope.entityId === context.entityId;
  if (level === 'segment') return scope.segment === context.segment;
  if (level === 'product') return scope.productCode === context.productCode;
  if (level === 'channel') return scope.channel === context.channel;
  return false;
}

export function selectChain(entries, context, now = new Date()) {
  const eligible = (entries || []).filter((entry) => {
    if (entry.status && entry.status !== 'active') return false;
    if (entry.effectiveFrom && new Date(entry.effectiveFrom) > now) return false;
    if (entry.effectiveTo && new Date(entry.effectiveTo) < now) return false;
    return scopeMatches(entry.scope, context);
  });

  const grouped = new Map();
  eligible.forEach((entry, index) => {
    const id = scopeIdentity(entry.scope);
    const list = grouped.get(id) || [];
    list.push({ entry, index });
    grouped.set(id, list);
  });

  const winners = [];
  for (const list of grouped.values()) {
    list.sort((a, b) => (a.entry.version || 0) - (b.entry.version || 0) || a.index - b.index);
    const latest = list[list.length - 1].entry;
    const value = list.reduce((acc, item) => deepMerge(acc, item.entry.value || {}), {});
    winners.push({ ...latest, value });
  }

  return winners.sort(
    (a, b) => (SCOPE_RANK[a.scope?.level] ?? 99) - (SCOPE_RANK[b.scope?.level] ?? 99),
  );
}

export function resolveLayers(entries, context, now) {
  const chain = selectChain(entries, context, now);
  const value = chain.reduce((acc, entry) => deepMerge(acc, entry.value || {}), {});
  return { value, chain };
}
