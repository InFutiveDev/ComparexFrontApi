import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";
import {
  computePgOnboardingCompletion,
  emptyPgOnboarding,
  resolvePgVerificationStatus,
  sanitizeOnboardingPayload,
} from "../utils/pgOnboarding.js";

const COLLECTION = "payment_providers";

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
