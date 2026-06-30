export const MERCHANT_INDUSTRIES = [
  { value: "ecommerce-d2c", label: "Ecommerce / D2C" },
  { value: "b2b-manufacturing", label: "B2B / Manufacturing Businesses" },
  { value: "saas-subscription-platforms", label: "SaaS / Subscription Platforms" },
  { value: "education-healthcare", label: "Education / Healthcare Services" },
  { value: "travel-bill-payments", label: "Travel / Bill Payments" },
  { value: "other-businesses", label: "Freelancers / Other Businesses" },
];

export const MERCHANT_PRIORITIES = [
  { value: "lower-transaction-fees", label: "Lower Transaction Fees" },
  { value: "faster-settlements", label: "Faster Settlements" },
  { value: "easy-onboarding-approval", label: "Easy Onboarding & Approval" },
  { value: "better-success-rates", label: "Better Success Rates" },
  { value: "international-payment-support", label: "International Payment Support" },
  { value: "subscription-recurring-billing", label: "Subscription / Recurring Billing" },
  { value: "better-customer-support", label: "Better Customer Support" },
  { value: "easy-website-app-integration", label: "Easy Website / App Integration" },
];

export const MERCHANT_INDUSTRY_VALUES = MERCHANT_INDUSTRIES.map((item) => item.value);
export const MERCHANT_PRIORITY_VALUES = MERCHANT_PRIORITIES.map((item) => item.value);
