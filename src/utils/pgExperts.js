import crypto from "crypto";

export const PG_EXPERT_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const WEEKDAY_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
  { value: "all-weekdays", label: "Mon–Fri (Weekdays)" },
  { value: "all-days", label: "All days (Mon–Sun)" },
];

export const WEEKDAY_LABELS = Object.fromEntries(
  WEEKDAY_OPTIONS.map((option) => [option.value, option.label]),
);

function text(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

export function newWeeklyScheduleEntry() {
  return {
    id: crypto.randomUUID(),
    days: [],
    times: [""],
  };
}

export function formatWeeklyAvailability(schedules = []) {
  if (!Array.isArray(schedules) || schedules.length === 0) return "";

  return schedules
    .map((entry) => {
      const dayLabels = (entry.days || [])
        .map((day) => WEEKDAY_LABELS[day] || day)
        .join(", ");
      const times = (entry.times || []).map((time) => text(time, 20)).filter(Boolean).join(", ");
      if (!dayLabels) return "";
      return times ? `${dayLabels}: ${times}` : dayLabels;
    })
    .filter(Boolean)
    .join(" | ");
}

export function formatWeeklyAvailabilitySlots(schedules = []) {
  const slots = [];

  for (const entry of schedules || []) {
    const dayLabels = (entry.days || [])
      .map((day) => WEEKDAY_LABELS[day] || day)
      .join(", ");
    if (!dayLabels) continue;

    for (const time of entry.times || []) {
      const label = text(time, 20);
      if (!label) continue;
      slots.push({
        id: `slot_${slots.length + 1}`,
        label: `${dayLabels} · ${label}`,
      });
    }
  }

  return slots.slice(0, 50);
}

export function normalizeWeeklyAvailability(input) {
  if (!Array.isArray(input)) return [];

  return input
    .slice(0, 20)
    .map((entry, index) => ({
      id: text(entry?.id, 100) || `schedule-${index + 1}`,
      days: Array.isArray(entry?.days)
        ? [...new Set(entry.days.map((day) => text(day, 40)).filter(Boolean))].slice(0, 8)
        : [],
      times: Array.isArray(entry?.times)
        ? entry.times.map((time) => text(time, 20)).filter(Boolean).slice(0, 12)
        : [],
    }))
    .filter((entry) => entry.days.length > 0 && entry.times.length > 0);
}

export function parseExpertAvailability(raw, weeklyAvailability = []) {
  const weeklySlots = formatWeeklyAvailabilitySlots(weeklyAvailability);
  if (weeklySlots.length > 0) return weeklySlots;

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

export function sanitizePgExpert(input = {}) {
  const status =
    input.status === PG_EXPERT_STATUSES.INACTIVE
      ? PG_EXPERT_STATUSES.INACTIVE
      : PG_EXPERT_STATUSES.ACTIVE;

  const weeklyAvailability = normalizeWeeklyAvailability(input.weeklyAvailability);
  const availabilityFromWeekly = formatWeeklyAvailability(weeklyAvailability);
  const availabilitySlots =
    availabilityFromWeekly || text(input.availabilitySlots, 2000);

  return {
    id: text(input.id, 100) || crypto.randomUUID(),
    name: text(input.name, 120),
    designation: text(input.designation, 120),
    email: text(input.email, 180).toLowerCase(),
    mobile: text(input.mobile, 30),
    description: text(input.description, 1000),
    calendlyUrl: text(input.calendlyUrl, 500),
    weeklyAvailability,
    availabilitySlots,
    calendarSynced: Boolean(input.calendarSynced || input.calendlyUrl),
    status,
  };
}

export function normalizePgExperts(input = []) {
  return (Array.isArray(input) ? input : []).slice(0, 20).map(sanitizePgExpert);
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
    }),
  ];
}

export function getActivePgExperts(provider) {
  return resolvePgExperts(provider).filter(
    (expert) => expert.status === PG_EXPERT_STATUSES.ACTIVE,
  );
}

/** @deprecated Use getActivePgExperts — kept for legacy callers expecting one expert. */
export function getPrimaryPgExpert(provider) {
  return getActivePgExperts(provider)[0] || null;
}

export function expertHasAvailability(expert) {
  if (!expert) return false;
  if (Array.isArray(expert.weeklyAvailability) && expert.weeklyAvailability.length > 0) {
    return true;
  }
  return Boolean(text(expert.availabilitySlots));
}

export function getAvailablePgExperts(provider) {
  return getActivePgExperts(provider).filter(expertHasAvailability);
}
