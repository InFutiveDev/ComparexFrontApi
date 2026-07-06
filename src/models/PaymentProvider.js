import { getDb } from "../mongo.js";

const COLLECTION = "payment_providers";

function providers() {
  return getDb().collection(COLLECTION);
}

export const PaymentProvider = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await providers().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({ page = 1, limit = 50 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      providers()
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      providers().countDocuments({}),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  sanitize(provider) {
    return {
      id: provider._id.toString(),
      companyName: provider.companyName,
      contactPerson: provider.contactPerson,
      designation: provider.designation,
      email: provider.email,
      phone: provider.phone,
      website: provider.website || "",
      paymentCapabilities: provider.paymentCapabilities,
      partnershipGoals: provider.partnershipGoals,
      consent: provider.consent ?? false,
      source: provider.source ?? null,
      createdAt: provider.createdAt,
    };
  },
};
