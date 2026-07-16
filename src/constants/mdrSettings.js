/** MDR (Merchant Discount Rate) — Master Admin FR-MA-07 / FR-MA-08 / FR-MA-09 */

export const MDR_RATE_TYPES = ["percent", "flat"];

export const MDR_TIER_BASIS = ["volume", "category"];

export const MDR_PAYMENT_MODES = [
  { value: "upi", label: "UPI" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "international", label: "International" },
  { value: "wallet", label: "Wallet" },
  { value: "net_banking", label: "Net Banking" },
  { value: "emi_bnpl", label: "EMI / BNPL" },
  { value: "other", label: "Other" },
];

export const MDR_CATEGORY_OPTIONS = [
  { value: "ecommerce-d2c", label: "Ecommerce / D2C" },
  { value: "saas-technology", label: "SaaS & Technology" },
  { value: "retail-offline", label: "Retail / Offline" },
  { value: "education-healthcare", label: "Education / Healthcare" },
  { value: "travel-bill-payments", label: "Travel / Bill Payments" },
  { value: "marketplace", label: "Marketplace" },
  { value: "fintech", label: "Fintech" },
  { value: "other", label: "Other" },
];

export const MDR_MODE_VALUES = MDR_PAYMENT_MODES.map((item) => item.value);
export const MDR_CATEGORY_VALUES = MDR_CATEGORY_OPTIONS.map((item) => item.value);

export function defaultMdrSettings() {
  return {
    currency: "INR",
    globalRates: MDR_PAYMENT_MODES.filter((item) => item.value !== "other").map(
      (mode, index) => ({
        id: `global_${mode.value}`,
        paymentMode: mode.value,
        label: mode.label,
        type: "percent",
        value: mode.value === "upi" ? 0 : mode.value === "credit_card" ? 1.8 : 1.0,
        active: true,
        sortOrder: index,
      }),
    ),
    tiers: [],
  };
}
