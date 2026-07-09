import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

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
    return {
      id: provider._id.toString(),
      companyName: provider.companyName,
      contactPerson: provider.contactPerson,
      designation: provider.designation,
      email: provider.email,
      phone: provider.phone,
      website: provider.website || "",
      paymentCapabilities: provider.paymentCapabilities ?? [],
      partnershipGoals: provider.partnershipGoals ?? [],
      consent: provider.consent ?? false,
      formStep: provider.formStep ?? 1,
      source: provider.source ?? null,
      userId: provider.userId?.toString() ?? null,
      accountStatus: provider.accountStatus ?? "inactive",
      createdAt: provider.createdAt,
    };
  },
};
