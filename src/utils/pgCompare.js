const MODE_FIELDS = {
  upi: "upiMdr",
  credit_card: "creditCardMdr",
  debit_card: "debitCardMdr",
  international: "internationalMdr",
  wallet: "walletCharges",
  net_banking: "netBankingCharges",
  emi_bnpl: "emiBnplCharges",
};

export const TAT_ORDER = {
  instant: 0,
  "1-2-days": 1,
  "3-5-days": 2,
  "1-week-plus": 3,
};

export function pgCompareSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function numericRate(value) {
  const match = String(value ?? "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function formatGlobalRate(rate) {
  if (!rate) return null;
  return rate.type === "flat" ? `₹${rate.value}` : `${rate.value}%`;
}

export function resolveCompareMdr(provider, mdrSettings) {
  const onboarding = provider.onboarding || {};
  const rates = {};
  const numeric = {};

  for (const [mode, field] of Object.entries(MODE_FIELDS)) {
    const configured = String(onboarding[field] || "").trim();
    const global = mdrSettings?.globalRates?.find(
      (rate) => rate.paymentMode === mode && rate.active !== false,
    );
    rates[mode] = configured || formatGlobalRate(global) || "Not configured";
    numeric[mode] =
      numericRate(configured) ??
      (global && Number.isFinite(Number(global.value)) ? Number(global.value) : null);
  }

  return {
    rates,
    numeric,
    defaultRate: rates.credit_card,
    defaultNumeric: numeric.credit_card,
  };
}

export function buildRatingMap(summaries = []) {
  const map = new Map();
  for (const item of summaries) {
    const rating = {
      average: Number(Number(item.average || 0).toFixed(1)),
      count: Number(item.count || 0),
      reviews: Array.isArray(item.reviews) ? item.reviews : [],
    };
    const paymentProviderId = item._id?.paymentProviderId;
    const productId = item._id?.productId;
    const productName = item._id?.productName;
    if (paymentProviderId) map.set(paymentProviderId, rating);
    if (productId) map.set(productId, rating);
    if (productName) map.set(productName, rating);
  }
  return map;
}

export function sanitizePgCompareRow(provider, { logoUrl, mdrSettings, ratingMap }) {
  const onboarding = provider.onboarding || {};
  const name =
    String(onboarding.brandName || "").trim() ||
    String(provider.companyName || "").trim() ||
    "Payment Gateway";
  const slug = pgCompareSlug(name);
  const mdr = resolveCompareMdr(provider, mdrSettings);
  const rating =
    ratingMap.get(provider._id.toString().toLowerCase()) ||
    ratingMap.get(slug) ||
    ratingMap.get(name.toLowerCase()) ||
    { average: 0, count: 0, reviews: [] };
  const categories = [
    ...(Array.isArray(onboarding.bestSuitedBusinessTypes)
      ? onboarding.bestSuitedBusinessTypes
      : []),
    ...(Array.isArray(provider.categories) ? provider.categories : []),
  ]
    .map((item) => String(item).trim())
    .filter(Boolean);

  return {
    id: provider._id.toString(),
    slug,
    name,
    companyName: provider.companyName || name,
    logoUrl: logoUrl || null,
    initials: name.slice(0, 2).toUpperCase(),
    website: provider.website || onboarding.websiteUrl || null,
    location:
      [onboarding.headquartersCity, onboarding.headquartersCountry]
        .filter(Boolean)
        .join(", ") ||
      provider.location ||
      null,
    mdr: mdr.rates,
    mdrNumeric: mdr.numeric,
    defaultMdr: mdr.defaultRate,
    defaultMdrNumeric: mdr.defaultNumeric,
    onboardingTat: onboarding.onboardingTat || null,
    tatOrder: TAT_ORDER[onboarding.onboardingTat] ?? 99,
    settlementCycle: onboarding.settlementCycle || null,
    features: Array.isArray(onboarding.features) ? onboarding.features : [],
    categories: [...new Set(categories)],
    restrictedCategories: Array.isArray(onboarding.restrictedCategories)
      ? onboarding.restrictedCategories
      : [],
    smartTags: Array.isArray(onboarding.smartTags) ? onboarding.smartTags : [],
    rating,
    verificationStatus: provider.verificationStatus || "incomplete",
  };
}
