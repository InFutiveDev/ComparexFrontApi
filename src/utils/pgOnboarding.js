import {
  PG_ONBOARDING_KEYS,
  PG_SERVICE_TYPE_VALUES,
  PG_VERIFICATION_STATUSES,
} from "../constants/paymentOnboarding.js";

function hasText(value) {
  return Boolean(typeof value === "string" ? value.trim() : value);
}

function hasArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function normalizeFileMeta(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const name = value.trim();
    return name ? { fileName: name } : null;
  }
  if (typeof value === "object") {
    const fileName = value.fileName || value.name || null;
    const url = value.url || null;
    const key = value.key || null;
    if (!fileName && !url && !key) return null;
    return {
      fileName: fileName || null,
      url,
      key,
      mimeType: value.mimeType || null,
      size: value.size ?? null,
    };
  }
  return null;
}

export function emptyPgOnboarding() {
  return Object.fromEntries(
    PG_ONBOARDING_KEYS.map((key) => {
      if (
        [
          "countriesSupported",
          "restrictedCategories",
          "bestSuitedBusinessTypes",
          "smartTags",
          "sortByCategories",
          "features",
          "sdkAvailability",
          "pluginAvailability",
          "mobileSdkSupport",
        ].includes(key)
      ) {
        return [key, []];
      }
      if (
        [
          "dedicatedAccountManager",
          "escalationSupport",
          "instantSettlementAvailability",
          "internationalPaymentsSupport",
          "offlineModeSupport",
          "gstBillingSupport",
          "sandboxAccess",
          "webhookSupport",
          "calendarSynced",
        ].includes(key)
      ) {
        return [key, false];
      }
      if (key === "talkToExpertEnabled") return [key, true];
      if (key === "experts") return [key, []];
      if (key === "companyLogo" || key === "onboardingChecklist") return [key, null];
      return [key, ""];
    }),
  );
}

export function sanitizeOnboardingPayload(input = {}, { mergeWith = null } = {}) {
  const base = { ...emptyPgOnboarding(), ...(mergeWith || {}) };
  const next = { ...base };

  for (const key of PG_ONBOARDING_KEYS) {
    if (input[key] === undefined) continue;

    if (key === "companyLogo" || key === "onboardingChecklist") {
      next[key] = normalizeFileMeta(input[key]);
      continue;
    }

    if (key === "experts") {
      next[key] = Array.isArray(input[key])
        ? input[key].filter((item) => item && typeof item === "object")
        : [];
      continue;
    }

    if (Array.isArray(base[key])) {
      next[key] = Array.isArray(input[key])
        ? input[key].map((item) => String(item)).filter(Boolean)
        : [];
      continue;
    }

    if (typeof base[key] === "boolean") {
      next[key] = Boolean(input[key]);
      continue;
    }

    next[key] = input[key] == null ? "" : String(input[key]).trim();
  }

  if (next.serviceType && !PG_SERVICE_TYPE_VALUES.includes(next.serviceType)) {
    next.serviceType = "";
  }

  return next;
}

export const PG_ONBOARDING_CHECKS = [
  {
    key: "serviceType",
    label: "Service Type",
    required: false,
    test: (o) => hasText(o.serviceType),
  },
  {
    key: "company",
    label: "Company Information",
    required: false,
    test: (o) =>
      hasText(o.legalEntityName) &&
      hasText(o.brandName) &&
      hasText(o.websiteUrl) &&
      hasText(o.headquartersCountry) &&
      hasText(o.headquartersCity) &&
      hasText(o.yearEstablished) &&
      hasText(o.pciDssStatus) &&
      hasText(o.companyOverview),
  },
  {
    key: "operations",
    label: "Operations",
    required: false,
    test: (o) =>
      hasText(o.onboardingTat) &&
      hasArray(o.restrictedCategories) &&
      hasArray(o.bestSuitedBusinessTypes),
  },
  {
    key: "smartTags",
    label: "Smart Tags",
    required: false,
    test: (o) => hasArray(o.smartTags),
  },
  {
    key: "sortBy",
    label: "Sort By Categories",
    required: false,
    test: (o) => hasArray(o.sortByCategories),
  },
  {
    key: "features",
    label: "Product Features",
    required: false,
    test: (o) => hasArray(o.features),
  },
  {
    key: "technical",
    label: "Technical Integration",
    required: false,
    test: (o) => hasText(o.apiDocumentationUrl) && hasArray(o.pluginAvailability),
  },
  {
    key: "talkToExpert",
    label: "Talk to Expert Setup",
    required: false,
    test: (o) =>
      !o.talkToExpertEnabled ||
      (hasText(o.expertName) &&
        hasText(o.expertEmail) &&
        hasText(o.expertMobile) &&
        hasText(o.expertDescription) &&
        Boolean(o.calendarSynced)),
  },
];

export function computePgOnboardingCompletion(provider = {}) {
  const onboarding = sanitizeOnboardingPayload(provider.onboarding || {});
  const checks = PG_ONBOARDING_CHECKS.map((item) => ({
    key: item.key,
    label: item.label,
    required: item.required,
    complete: item.test(onboarding),
  }));

  const total = checks.length;
  const completed = checks.filter((item) => item.complete).length;
  const requiredChecks = checks.filter((item) => item.required);
  const requiredComplete = requiredChecks.every((item) => item.complete);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    percent,
    completed,
    total,
    requiredComplete,
    checks,
  };
}

export function resolvePgVerificationStatus(provider, profile) {
  const current = provider.verificationStatus || PG_VERIFICATION_STATUSES.INCOMPLETE;

  if (
    current === PG_VERIFICATION_STATUSES.APPROVED ||
    current === PG_VERIFICATION_STATUSES.REJECTED
  ) {
    return current;
  }

  if (profile.requiredComplete) {
    return PG_VERIFICATION_STATUSES.PENDING_REVIEW;
  }

  return PG_VERIFICATION_STATUSES.INCOMPLETE;
}
