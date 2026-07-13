export const USER_ROLES = {
  MERCHANT: "merchant",
  RESELLER: "reseller",
  PAYMENT_PROVIDER: "payment_provider",
  ADMIN: "admin",
  SUB_ADMIN: "sub_admin",
};

export const ACCOUNT_TYPE_TO_ROLE = {
  Merchant: USER_ROLES.MERCHANT,
  Reseller: USER_ROLES.RESELLER,
  "Payment Gateway": USER_ROLES.PAYMENT_PROVIDER,
  Admin: USER_ROLES.ADMIN,
  "Sub Admin": USER_ROLES.SUB_ADMIN,
};

const ROLE_LABELS = {
  [USER_ROLES.MERCHANT]: "Merchant",
  [USER_ROLES.RESELLER]: "Reseller",
  [USER_ROLES.PAYMENT_PROVIDER]: "Payment Gateway",
  [USER_ROLES.ADMIN]: "Admin",
  [USER_ROLES.SUB_ADMIN]: "Sub Admin",
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

  // Admin may use any tab. Sub Admin may use the Sub Admin tab.
  if (actualRole === USER_ROLES.ADMIN) {
    return true;
  }

  if (actualRole === USER_ROLES.SUB_ADMIN && expectedRole === USER_ROLES.SUB_ADMIN) {
    return true;
  }

  return actualRole === expectedRole;
}

export function isStaffRole(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.SUB_ADMIN;
}
