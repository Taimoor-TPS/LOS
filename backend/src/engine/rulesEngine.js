function compare(left, op, right) {
  switch (op) {
    case 'eq': return left === right;
    case 'neq': return left !== right;
    case 'gt': return Number(left) > Number(right);
    case 'gte': return Number(left) >= Number(right);
    case 'lt': return Number(left) < Number(right);
    case 'lte': return Number(left) <= Number(right);
    case 'in': return Array.isArray(right) && right.includes(left);
    case 'nin': return Array.isArray(right) && !right.includes(left);
    case 'truthy': return Boolean(left);
    case 'falsy': return !left;
    default: return false;
  }
}

export function matchRule(rule, features) {
  const when = rule.when || {};
  const all = when.all || [];
  const any = when.any || [];
  const allOk = all.every((condition) => compare(features[condition.field], condition.op, condition.value));
  const anyOk = any.length === 0 || any.some((condition) => compare(features[condition.field], condition.op, condition.value));
  return allOk && anyOk;
}

function applies(rule, features) {
  const scope = rule.appliesTo || {};
  const products = scope.products || ['*'];
  const segments = scope.segments || ['*'];
  const jurisdictions = scope.jurisdictions || ['*'];
  return (products.includes('*') || products.includes(features.productCode))
    && (segments.includes('*') || segments.includes(features.segment))
    && (jurisdictions.includes('*') || jurisdictions.includes(features.jurisdiction));
}

export function runStage(rules, stage, features) {
  const relevant = (rules || [])
    .filter((rule) => rule.enabled !== false && rule.status !== 'retired' && rule.status !== 'draft' && rule.stage === stage)
    .filter((rule) => applies(rule, features))
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

  const fired = [];
  for (const rule of relevant) {
    if (!matchRule(rule, features)) continue;
    fired.push({
      code: rule.code,
      name: rule.name,
      reasonCode: rule.then?.reasonCode,
      outcome: rule.then?.outcome || null,
      stop: Boolean(rule.then?.stop),
    });
    if (rule.then?.stop) break;
  }
  return fired;
}
