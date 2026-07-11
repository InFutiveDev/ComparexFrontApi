export const USER_ROLES = {
  MERCHANT: "merchant",
  RESELLER: "reseller",
  PAYMENT_PROVIDER: "payment_provider",
  ADMIN: "admin",
};

export const ACCOUNT_TYPE_TO_ROLE = {
  Merchant: USER_ROLES.MERCHANT,
  Reseller: USER_ROLES.RESELLER,
  "Payment Gateway": USER_ROLES.PAYMENT_PROVIDER,
  Admin: USER_ROLES.ADMIN,
};

const ROLE_LABELS = {
  [USER_ROLES.MERCHANT]: "Merchant",
  [USER_ROLES.RESELLER]: "Reseller",
  [USER_ROLES.PAYMENT_PROVIDER]: "Payment Gateway",
  [USER_ROLES.ADMIN]: "Admin",
};

export function resolveLoginRole({ role, accountType }) {
  if (role) return role;
  if (accountType && ACCOUNT_TYPE_TO_ROLE[accountType]) {
    return ACCOUNT_TYPE_TO_ROLE[accountType];
  }
  return null;
}

export function formatRoleLabel(role) {
  return ROLE_LABELS[role] ?? "this account type";
}

export function canLoginWithRole(userRole, expectedRole) {
  const actualRole = userRole ?? "user";

  if (!expectedRole) {
    return true;
  }

  // Admin tab is admin-only. Admins may also use other tabs.
  if (actualRole === USER_ROLES.ADMIN) {
    return true;
  }

  return actualRole === expectedRole;
}
