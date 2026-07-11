export const RESELLER_PARTNER_TYPES = [
  { value: "consultant-advisor", label: "Consultant / Advisor" },
  { value: "digital-marketing-agency", label: "Digital / Marketing Agency" },
  { value: "finance-compliance", label: "Finance & Compliance Professional" },
  { value: "technology-integration", label: "Technology & Integration Partner" },
  { value: "business-services", label: "Business Services Provider" },
  { value: "other", label: "Other" },
];

export const RESELLER_BUSINESS_TYPES = [
  { value: "ecommerce-d2c", label: "Ecommerce & D2C" },
  { value: "saas-technology", label: "SaaS & Technology" },
  { value: "retail-offline", label: "Retail & Offline Businesses" },
  { value: "travel-utilities", label: "Travel & Utilities" },
  { value: "exporters-international", label: "Exporters & International Businesses" },
  { value: "multiple-types", label: "Multiple Business Types" },
];

export const RESELLER_MONTHLY_BUSINESS_COUNTS = [
  { value: "1-5", label: "1–5" },
  { value: "6-10", label: "6–10" },
  { value: "11-25", label: "11–25" },
  { value: "25-plus", label: "25+" },
];

export const RESELLER_PAYMENT_FAMILIARITY = [
  { value: "new", label: "New to the Payments Ecosystem" },
  { value: "familiar", label: "Familiar with Common Payment Solutions" },
  { value: "experienced", label: "Experienced in Payment Gateway Evaluation & Onboarding" },
  { value: "regular-advisor", label: "Regularly Advise Businesses on Payment Solutions" },
];

export const RESELLER_PARTNERSHIP_MODELS = [
  { value: "qualified-opportunity-fee", label: "Qualified Opportunity Fee" },
  { value: "revenue-sharing", label: "Revenue Sharing" },
];

export const RESELLER_YEARS_EXPERIENCE = [
  { value: "0-1", label: "0–1 years" },
  { value: "1-3", label: "1–3 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "5-10", label: "5–10 years" },
  { value: "10-plus", label: "10+ years" },
];

export const RESELLER_MERCHANT_NETWORK_SIZES = [
  { value: "none", label: "No existing network" },
  { value: "1-10", label: "1–10 merchants" },
  { value: "11-50", label: "11–50 merchants" },
  { value: "51-100", label: "51–100 merchants" },
  { value: "100-plus", label: "100+ merchants" },
];

export const RESELLER_MONTHLY_REFERRALS = [
  { value: "1-5", label: "1–5 referrals" },
  { value: "6-15", label: "6–15 referrals" },
  { value: "16-30", label: "16–30 referrals" },
  { value: "30-plus", label: "30+ referrals" },
];

export const RESELLER_BANK_ACCOUNT_TYPES = [
  { value: "savings", label: "Savings Account" },
  { value: "current", label: "Current Account" },
];

export const RESELLER_VERIFICATION_STATUSES = {
  INCOMPLETE: "incomplete",
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const RESELLER_PARTNER_TYPE_VALUES = RESELLER_PARTNER_TYPES.map((item) => item.value);
export const RESELLER_BUSINESS_TYPE_VALUES = RESELLER_BUSINESS_TYPES.map((item) => item.value);
export const RESELLER_MONTHLY_BUSINESS_COUNT_VALUES = RESELLER_MONTHLY_BUSINESS_COUNTS.map(
  (item) => item.value,
);
export const RESELLER_PAYMENT_FAMILIARITY_VALUES = RESELLER_PAYMENT_FAMILIARITY.map(
  (item) => item.value,
);
export const RESELLER_PARTNERSHIP_MODEL_VALUES = RESELLER_PARTNERSHIP_MODELS.map(
  (item) => item.value,
);
export const RESELLER_YEARS_EXPERIENCE_VALUES = RESELLER_YEARS_EXPERIENCE.map((item) => item.value);
export const RESELLER_MERCHANT_NETWORK_SIZE_VALUES = RESELLER_MERCHANT_NETWORK_SIZES.map(
  (item) => item.value,
);
export const RESELLER_MONTHLY_REFERRAL_VALUES = RESELLER_MONTHLY_REFERRALS.map((item) => item.value);
export const RESELLER_BANK_ACCOUNT_TYPE_VALUES = RESELLER_BANK_ACCOUNT_TYPES.map(
  (item) => item.value,
);
