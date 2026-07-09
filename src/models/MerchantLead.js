import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "merchant_leads";

function leads() {
  return getDb().collection(COLLECTION);
}

export const MerchantLead = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await leads().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({ page = 1, limit = 50 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      leads()
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      leads().countDocuments({}),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  async deleteById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, deleted: false };
    }

    const result = await leads().deleteOne({ _id: objectId });
    return { invalid: false, deleted: result.deletedCount > 0 };
  },

  findById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return null;
    }

    return leads().findOne({ _id: objectId });
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

    const result = await leads().findOneAndUpdate(
      { _id: objectId },
      { $set: updates },
      { returnDocument: "after" },
    );

    if (!result) {
      return { invalid: false, updated: null };
    }

    return { invalid: false, updated: result };
  },

  sanitize(lead) {
    return {
      id: lead._id.toString(),
      businessName: lead.businessName,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry ?? null,
      priority: lead.priority ?? null,
      formStep: lead.formStep ?? 1,
      source: lead.source ?? null,
      userId: lead.userId?.toString() ?? null,
      accountStatus: lead.accountStatus ?? "inactive",
      createdAt: lead.createdAt,
    };
  },
};
