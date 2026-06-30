export const PAYMENT_CAPABILITIES = [
  { value: "online-payment", label: "Online Payment Acceptance" },
  { value: "upi", label: "UPI Payment Solutions" },
  { value: "subscription-billing", label: "Subscription & Recurring Billing" },
  { value: "cross-border", label: "International & Cross-Border Payments" },
  { value: "checkout-optimization", label: "Checkout & Conversion Optimization" },
  { value: "routing-orchestration", label: "Payment Routing & Orchestration" },
  { value: "payouts", label: "Payouts & Disbursements" },
  { value: "pos-offline", label: "POS & Offline Payments" },
  { value: "merchant-banking", label: "Merchant Banking & Financial Services" },
  { value: "fraud-risk", label: "Fraud Prevention & Risk Management" },
  { value: "other", label: "Other" },
];

export const PAYMENT_PARTNERSHIP_GOALS = [
  { value: "visibility", label: "Increase Visibility Among Businesses Evaluating Solutions" },
  { value: "connect-segments", label: "Connect with Relevant Business Segments" },
  { value: "acquisition-efficiency", label: "Improve Merchant Acquisition Efficiency" },
  { value: "showcase-strengths", label: "Showcase Product Strengths & Differentiators" },
  { value: "partnership-opportunities", label: "Explore Partnership Opportunities" },
  { value: "learn-more", label: "Learn More About CompareX" },
  { value: "multiple-objectives", label: "Multiple Objectives" },
];

export const PAYMENT_CAPABILITY_VALUES = PAYMENT_CAPABILITIES.map((item) => item.value);
export const PAYMENT_PARTNERSHIP_GOAL_VALUES = PAYMENT_PARTNERSHIP_GOALS.map((item) => item.value);
