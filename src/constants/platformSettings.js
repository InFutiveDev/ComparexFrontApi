import { USER_ROLES } from "./userRoles.js";
import { defaultMdrSettings } from "./mdrSettings.js";

export const PLATFORM_SETTINGS_DOC_ID = "global";

export const FEE_TYPES = ["percent", "flat"];

export const FEE_APPLIES_TO = [
  USER_ROLES.MERCHANT,
  USER_ROLES.RESELLER,
  USER_ROLES.PAYMENT_PROVIDER,
  "platform",
];

export const PAYOUT_SCHEDULES = ["weekly", "biweekly", "monthly", "on_demand"];

export const PLATFORM_PERMISSIONS = [
  { key: "dashboard:access", label: "Access dashboard" },
  { key: "leads:read", label: "View leads" },
  { key: "leads:write", label: "Qualify / update leads" },
  { key: "leads:assign", label: "Assign leads to PGs" },
  { key: "leads:bulk", label: "Bulk upload leads" },
  { key: "merchants:read", label: "View merchants" },
  { key: "merchants:write", label: "Manage merchants" },
  { key: "resellers:read", label: "View resellers" },
  { key: "resellers:write", label: "Manage resellers" },
  { key: "payment_gateways:read", label: "View payment gateways" },
  { key: "payment_gateways:write", label: "Manage payment gateways" },
  { key: "experts:read", label: "View Talk to Expert" },
  { key: "experts:write", label: "Manage Talk to Expert" },
  { key: "reviews:read", label: "View reviews" },
  { key: "reviews:write", label: "Moderate reviews" },
  { key: "support:read", label: "View support tickets" },
  { key: "support:write", label: "Manage support tickets" },
  { key: "reports:read", label: "View reports" },
  { key: "settings:read", label: "View system settings" },
  { key: "settings:write", label: "Edit system settings" },
  { key: "users:manage", label: "Manage user access rights" },
  { key: "payouts:manage", label: "Manage payout rules" },
];

export function defaultFeeSettings() {
  return {
    currency: "INR",
    structures: [
      {
        id: "platform_service_fee",
        name: "Platform service fee",
        description: "CompareX platform fee charged on referred business volume",
        appliesTo: ["reseller", "merchant"],
        type: "percent",
        value: 1.5,
        minAmount: 0,
        maxAmount: null,
        active: true,
      },
      {
        id: "reseller_opportunity_fee",
        name: "Reseller opportunity fee",
        description: "Fee applied when a reseller closes a qualified opportunity",
        appliesTo: ["reseller"],
        type: "flat",
        value: 500,
        minAmount: 0,
        maxAmount: null,
        active: true,
      },
      {
        id: "pg_listing_fee",
        name: "PG marketplace listing fee",
        description: "Optional listing fee for payment gateway partners",
        appliesTo: ["payment_provider"],
        type: "flat",
        value: 0,
        minAmount: 0,
        maxAmount: null,
        active: false,
      },
    ],
  };
}

export function defaultPermissionSettings() {
  const allKeys = PLATFORM_PERMISSIONS.map((item) => item.key);

  return {
    roles: [
      {
        role: USER_ROLES.ADMIN,
        label: "Master Admin",
        permissions: ["*"],
      },
      {
        role: USER_ROLES.SUB_ADMIN,
        label: "Sub Admin",
        permissions: [
          "dashboard:access",
          "leads:read",
          "leads:write",
          "leads:assign",
          "leads:bulk",
          "payment_gateways:read",
          "experts:read",
          "experts:write",
          "merchants:read",
        ],
      },
      {
        role: USER_ROLES.MERCHANT,
        label: "Merchant",
        permissions: ["dashboard:access"],
      },
      {
        role: USER_ROLES.RESELLER,
        label: "Reseller",
        permissions: ["dashboard:access"],
      },
      {
        role: USER_ROLES.PAYMENT_PROVIDER,
        label: "Payment Gateway",
        permissions: ["dashboard:access"],
      },
    ],
    availablePermissions: PLATFORM_PERMISSIONS,
    allPermissionKeys: allKeys,
  };
}

export function defaultPayoutSettings() {
  return {
    currency: "INR",
    minPayoutAmount: 1000,
    payoutSchedule: "monthly",
    payoutDayOfMonth: 7,
    holdDaysAfterActivation: 14,
    autoApproveBelow: 25000,
    eligibleStatuses: ["approved", "active"],
    rules: [
      {
        id: "reseller_default",
        name: "Reseller default threshold",
        role: USER_ROLES.RESELLER,
        threshold: 1000,
        active: true,
      },
      {
        id: "payment_provider_default",
        name: "PG partner default threshold",
        role: USER_ROLES.PAYMENT_PROVIDER,
        threshold: 5000,
        active: true,
      },
    ],
  };
}

export function defaultPlatformSettings() {
  return {
    fees: defaultFeeSettings(),
    permissions: defaultPermissionSettings(),
    payouts: defaultPayoutSettings(),
    mdr: defaultMdrSettings(),
  };
}
