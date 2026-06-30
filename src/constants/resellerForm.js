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

export const RESELLER_PARTNER_TYPE_VALUES = RESELLER_PARTNER_TYPES.map((item) => item.value);
export const RESELLER_BUSINESS_TYPE_VALUES = RESELLER_BUSINESS_TYPES.map((item) => item.value);
export const RESELLER_MONTHLY_BUSINESS_COUNT_VALUES = RESELLER_MONTHLY_BUSINESS_COUNTS.map(
  (item) => item.value,
);
export const RESELLER_PAYMENT_FAMILIARITY_VALUES = RESELLER_PAYMENT_FAMILIARITY.map(
  (item) => item.value,
);
