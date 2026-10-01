export async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-LOS-Client': 'web',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

export function money(value, currency = 'PKR') {
  const amount = Math.round(Number(value) || 0).toLocaleString('en-PK');
  if (currency === 'SAR') return `SAR ${amount}`;
  if (currency === 'AED') return `AED ${amount}`;
  return `PKR ${amount}`;
}

export function rateLabel(rate) {
  return `${((Number(rate) || 0) * 100).toFixed(2)}%`;
}

export const ROLE_LABEL = {
  customer: 'Customer',
  relationship_manager: 'Relationship manager',
  branch_officer: 'Branch officer',
  underwriter: 'Underwriter',
  credit_officer: 'Credit officer',
  credit_committee: 'Credit committee',
  operations: 'Operations',
  shariah_advisor: 'Shariah advisor',
  marketing: 'Marketing',
  credit_policy: 'Credit policy',
  model_risk: 'Model risk',
  compliance: 'Compliance',
  auditor: 'Auditor',
  dealer: 'Dealer',
  system_admin: 'System admin',
};
