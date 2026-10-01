export const ROLES = {
  CUSTOMER: 'customer',
  RELATIONSHIP_MANAGER: 'relationship_manager',
  BRANCH_OFFICER: 'branch_officer',
  UNDERWRITER: 'underwriter',
  CREDIT_OFFICER: 'credit_officer',
  CREDIT_COMMITTEE: 'credit_committee',
  OPERATIONS: 'operations',
  SHARIAH_ADVISOR: 'shariah_advisor',
  MARKETING: 'marketing',
  CREDIT_POLICY: 'credit_policy',
  MODEL_RISK: 'model_risk',
  COMPLIANCE: 'compliance',
  AUDITOR: 'auditor',
  DEALER: 'dealer',
  SYSTEM_ADMIN: 'system_admin',
};

export const STAFF_ROLES = Object.values(ROLES).filter((role) => role !== ROLES.CUSTOMER);

export const CHECKER_ROLES = [ROLES.CREDIT_POLICY, ROLES.COMPLIANCE, ROLES.SYSTEM_ADMIN, ROLES.SHARIAH_ADVISOR];

export const CASE_READ_ROLES = [
  ROLES.RELATIONSHIP_MANAGER,
  ROLES.BRANCH_OFFICER,
  ROLES.UNDERWRITER,
  ROLES.CREDIT_OFFICER,
  ROLES.CREDIT_COMMITTEE,
  ROLES.OPERATIONS,
  ROLES.SHARIAH_ADVISOR,
  ROLES.COMPLIANCE,
  ROLES.AUDITOR,
  ROLES.SYSTEM_ADMIN,
  ROLES.MODEL_RISK,
  ROLES.CREDIT_POLICY,
  ROLES.DEALER,
];

export function canApproveConfig(user, key = '') {
  if (!CHECKER_ROLES.includes(user.role)) return false;
  if (user.role === ROLES.SHARIAH_ADVISOR) return key.startsWith('islamic.') || key.startsWith('reason.');
  return true;
}
