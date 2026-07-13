export const PG_DOMAINS = [
  "Razorpay",
  "Cashfree",
  "PayU",
  "CCAvenue",
  "Easebuzz",
  "Stripe",
  "Paytm",
  "PhonePe",
  "Amazon Pay",
  "Other",
];

export const PG_DOMAIN_VALUES = PG_DOMAINS.map((value) => value.toLowerCase());

export function normalizePgDomain(value) {
  if (!value?.trim()) return null;

  const trimmed = value.trim();
  const match = PG_DOMAINS.find(
    (domain) => domain.toLowerCase() === trimmed.toLowerCase(),
  );

  return match || trimmed;
}
