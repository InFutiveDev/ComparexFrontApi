import crypto from "crypto";

export const PG_EXPERT_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

function text(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

export function parseExpertAvailability(raw) {
  return text(raw, 2000)
    .split(/[\n;,|]+/)
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((label, index) => ({
      id: `slot_${index + 1}`,
      label,
    }));
}

export function sanitizePgExpert(input = {}, index = 0) {
  const status =
    input.status === PG_EXPERT_STATUSES.INACTIVE
      ? PG_EXPERT_STATUSES.INACTIVE
      : PG_EXPERT_STATUSES.ACTIVE;

  return {
    id: text(input.id, 100) || crypto.randomUUID(),
    name: text(input.name, 120),
    designation: text(input.designation, 120),
    email: text(input.email, 180).toLowerCase(),
    mobile: text(input.mobile, 30),
    description: text(input.description, 1000),
    calendlyUrl: text(input.calendlyUrl, 500),
    availabilitySlots: text(input.availabilitySlots, 2000),
    calendarSynced: Boolean(input.calendarSynced || input.calendlyUrl),
    status,
    isPrimary:
      input.isPrimary === undefined ? index === 0 : Boolean(input.isPrimary),
  };
}

export function normalizePgExperts(input = []) {
  const experts = (Array.isArray(input) ? input : [])
    .slice(0, 20)
    .map(sanitizePgExpert);
  const active = experts.filter(
    (expert) => expert.status === PG_EXPERT_STATUSES.ACTIVE,
  );
  const requestedPrimary = active.find((expert) => expert.isPrimary) || active[0];

  return experts.map((expert) => ({
    ...expert,
    isPrimary: Boolean(requestedPrimary && expert.id === requestedPrimary.id),
  }));
}

export function resolvePgExperts(provider) {
  const onboarding = provider?.onboarding || {};
  if (Array.isArray(onboarding.experts) && onboarding.experts.length > 0) {
    return normalizePgExperts(onboarding.experts);
  }

  if (!text(onboarding.expertName)) return [];

  return [
    sanitizePgExpert({
      id: "legacy-primary",
      name: onboarding.expertName,
      designation: onboarding.expertDesignation,
      email: onboarding.expertEmail,
      mobile: onboarding.expertMobile,
      description: onboarding.expertDescription,
      calendlyUrl: onboarding.calendlyUrl,
      availabilitySlots: onboarding.availabilitySlots,
      calendarSynced: onboarding.calendarSynced,
      status: onboarding.talkToExpertEnabled === false ? "inactive" : "active",
      isPrimary: true,
    }),
  ];
}

export function getPrimaryPgExpert(provider) {
  const experts = resolvePgExperts(provider).filter(
    (expert) => expert.status === PG_EXPERT_STATUSES.ACTIVE,
  );
  return experts.find((expert) => expert.isPrimary) || experts[0] || null;
}
