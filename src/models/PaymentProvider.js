import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";
import {
  computePgOnboardingCompletion,
  emptyPgOnboarding,
  resolvePgVerificationStatus,
  sanitizeOnboardingPayload,
} from "../utils/pgOnboarding.js";
import { getSignedDownloadUrl } from "../services/s3Service.js";
import {
  getActivePgExperts,
  getAvailablePgExperts,
  parseExpertAvailability,
  resolvePgExperts,
} from "../utils/pgExperts.js";

const COLLECTION = "payment_providers";

/** Turn free-text PG availability into selectable slot labels for FR-SA-08. */
function parseAvailabilitySlotLabels(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  const parts = text
    .split(/[\n;,|]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts.slice(0, 16).map((label, index) => ({
      id: `slot_${index + 1}`,
      label,
    }));
  }

  // Single summary like "Mon–Fri 10:00–18:00 IST" → expand sample days/times for display
  const sampleTimes = ["10:00 AM", "11:30 AM", "2:00 PM", "4:30 PM"];
  const slots = [];
  for (let dayOffset = 1; dayOffset <= 5; dayOffset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateLabel = date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    for (const time of sampleTimes) {
      slots.push({
        id: `${dayOffset}-${time}`,
        label: `${dateLabel} · ${time}`,
        dateLabel,
        time,
      });
    }
  }
  return slots.slice(0, 12);
}

function providers() {
  return getDb().collection(COLLECTION);
}

function buildFilter({
  location,
  category,
  minSuccessRate,
  minSettlementScore,
  search,
} = {}) {
  const filter = {};

  if (location) {
    filter.location = { $regex: location.trim(), $options: "i" };
  }

  if (category) {
    filter.$or = [
      { paymentCapabilities: category },
      { categories: category },
    ];
  }

  if (minSuccessRate !== undefined && minSuccessRate !== null && minSuccessRate !== "") {
    filter["performance.successRate"] = { $gte: Number(minSuccessRate) };
  }

  if (minSettlementScore !== undefined && minSettlementScore !== null && minSettlementScore !== "") {
    filter["performance.settlementScore"] = { $gte: Number(minSettlementScore) };
  }

  if (search?.trim()) {
    const q = search.trim();
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { companyName: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { contactPerson: { $regex: q, $options: "i" } },
        ],
      },
    ];
  }

  return filter;
}

export const PaymentProvider = {
  async create(data) {
    const now = new Date();
    const doc = {
      location: data.location ?? null,
      categories: data.categories ?? [],
      performance: {
        successRate: data.performance?.successRate ?? 0,
        settlementScore: data.performance?.settlementScore ?? 0,
        avgSettlementHours: data.performance?.avgSettlementHours ?? null,
        totalMerchants: data.performance?.totalMerchants ?? 0,
      },
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await providers().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({
    page = 1,
    limit = 50,
    location,
    category,
    minSuccessRate,
    minSettlementScore,
    search,
  } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;
    const filter = buildFilter({
      location,
      category,
      minSuccessRate,
      minSettlementScore,
      search,
    });

    const [items, total] = await Promise.all([
      providers()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      providers().countDocuments(filter),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  async deleteById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, deleted: false };
    }

    const result = await providers().deleteOne({ _id: objectId });
    return { invalid: false, deleted: result.deletedCount > 0 };
  },

  findById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return null;
    }

    return providers().findOne({ _id: objectId });
  },

  findByUserId(userId) {
    const objectId = parseObjectId(userId);
    if (!objectId) {
      return null;
    }

    return providers().findOne({ userId: objectId });
  },

  /** Public Talk to Expert listing — PGs that nominated an expert. */
  async findTalkToExpertProviders({ search } = {}) {
    const filter = {
      "onboarding.talkToExpertEnabled": true,
      accountStatus: { $ne: "inactive" },
      $or: [
        { "onboarding.expertName": { $exists: true, $nin: [null, ""] } },
        {
          "onboarding.experts": {
            $elemMatch: {
              name: { $exists: true, $nin: [null, ""] },
              status: { $ne: "inactive" },
            },
          },
        },
      ],
    };

    if (search?.trim()) {
      const q = search.trim();
      filter.$and = [
        {
          $or: [
            { companyName: { $regex: q, $options: "i" } },
            { "onboarding.brandName": { $regex: q, $options: "i" } },
            { "onboarding.expertName": { $regex: q, $options: "i" } },
            { "onboarding.experts.name": { $regex: q, $options: "i" } },
          ],
        },
      ];
    }

    return providers()
      .find(filter)
      .sort({ companyName: 1 })
      .limit(100)
      .toArray();
  },

  async sanitizeTalkToExpert(provider, selectedExpert = null) {
    const onboarding = sanitizeOnboardingPayload(provider.onboarding || emptyPgOnboarding());
    const name =
      (onboarding.brandName || "").trim() ||
      (provider.companyName || "").trim() ||
      "Payment Gateway";
    const activeExperts = getAvailablePgExperts(provider);
    const expert = selectedExpert || activeExperts[0] || getActivePgExperts(provider)[0] || null;
    const expertName = (expert?.name || onboarding.expertName || "").trim();
    let logoUrl = onboarding.companyLogo?.url || null;
    if (onboarding.companyLogo?.key) {
      try {
        logoUrl = await getSignedDownloadUrl(onboarding.companyLogo.key);
      } catch (error) {
        console.error("Failed to refresh PG expert logo URL:", error.message);
      }
    }
    const availabilityRaw = (
      expert?.availabilitySlots ||
      onboarding.availabilitySlots ||
      ""
    ).trim();
    const calendlyUrl = (
      expert?.calendlyUrl ||
      onboarding.calendlyUrl ||
      ""
    ).trim() || null;
    const experts = resolvePgExperts(provider)
      .filter((item) => item.status !== "inactive")
      .filter((item) => {
        if (item.weeklyAvailability?.length) return true;
        return Boolean(String(item.availabilitySlots || "").trim());
      })
      .map((item) => ({
        ...item,
        availableSlots: parseExpertAvailability(
          item.availabilitySlots,
          item.weeklyAvailability,
        ),
      }));

    return {
      id: provider._id.toString(),
      paymentGatewayId: provider._id.toString(),
      expertId: expert?.id || null,
      routingId: expert?.id
        ? `${provider._id.toString()}:${expert.id}`
        : provider._id.toString(),
      name,
      companyName: provider.companyName || name,
      logo: logoUrl,
      initials: name.slice(0, 2).toUpperCase(),
      calendlyUrl,
      calendarSynced: Boolean(expert?.calendarSynced || onboarding.calendarSynced),
      availabilitySlots: availabilityRaw || null,
      availableSlots: parseExpertAvailability(availabilityRaw, expert?.weeklyAvailability),
      rep: {
        name: expertName,
        title:
          (expert?.designation || onboarding.expertDesignation || "").trim() ||
          "PG Representative",
        experience: "Nominated partner expert",
        bio:
          (expert?.description || onboarding.expertDescription || "").trim() ||
          `Connect with ${expertName} from ${name} for onboarding guidance and commercial discussions.`,
        email: (expert?.email || onboarding.expertEmail || "").trim() || null,
        phone: (expert?.mobile || onboarding.expertMobile || "").trim() || null,
      },
      experts,
    };
  },

  async updateById(id, data) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, updated: null };
    }

    const updates = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await providers().findOneAndUpdate(
      { _id: objectId },
      { $set: updates },
      { returnDocument: "after" },
    );

    if (!result) {
      return { invalid: false, updated: null };
    }

    return { invalid: false, updated: result };
  },

  sanitize(provider) {
    const onboarding = sanitizeOnboardingPayload(provider.onboarding || emptyPgOnboarding());
    const profileCompletion = computePgOnboardingCompletion({ onboarding });
    const verificationStatus =
      provider.verificationStatus ||
      resolvePgVerificationStatus(provider, profileCompletion);

    return {
      id: provider._id.toString(),
      companyName: provider.companyName,
      contactPerson: provider.contactPerson,
      designation: provider.designation,
      email: provider.email,
      phone: provider.phone,
      website: provider.website || "",
      location: provider.location ?? null,
      categories: provider.categories ?? [],
      paymentCapabilities: provider.paymentCapabilities ?? [],
      partnershipGoals: provider.partnershipGoals ?? [],
      performance: {
        successRate: provider.performance?.successRate ?? 0,
        settlementScore: provider.performance?.settlementScore ?? 0,
        avgSettlementHours: provider.performance?.avgSettlementHours ?? null,
        totalMerchants: provider.performance?.totalMerchants ?? 0,
      },
      consent: provider.consent ?? false,
      formStep: provider.formStep ?? 1,
      source: provider.source ?? null,
      userId: provider.userId?.toString() ?? null,
      accountStatus: provider.accountStatus ?? "inactive",
      onboarding,
      verificationStatus,
      profileCompletionPercent: profileCompletion.percent,
      profileCompletion,
      onboardingSubmittedAt: provider.onboardingSubmittedAt ?? null,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt ?? null,
    };
  },
};
