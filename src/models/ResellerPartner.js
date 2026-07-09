import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "reseller_partners";

function partners() {
  return getDb().collection(COLLECTION);
}

export const ResellerPartner = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await partners().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({ page = 1, limit = 50 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      partners()
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      partners().countDocuments({}),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  async deleteById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, deleted: false };
    }

    const result = await partners().deleteOne({ _id: objectId });
    return { invalid: false, deleted: result.deletedCount > 0 };
  },

  findById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return null;
    }

    return partners().findOne({ _id: objectId });
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

    const result = await partners().findOneAndUpdate(
      { _id: objectId },
      { $set: updates },
      { returnDocument: "after" },
    );

    if (!result) {
      return { invalid: false, updated: null };
    }

    return { invalid: false, updated: result };
  },

  sanitize(partner) {
    return {
      id: partner._id.toString(),
      fullName: partner.fullName,
      businessName: partner.businessName,
      email: partner.email,
      phone: partner.phone,
      website: partner.website || "",
      partnerType: partner.partnerType ?? null,
      businessTypes: partner.businessTypes ?? [],
      monthlyBusinessCount: partner.monthlyBusinessCount ?? null,
      paymentFamiliarity: partner.paymentFamiliarity ?? null,
      consent: partner.consent ?? false,
      formStep: partner.formStep ?? 1,
      source: partner.source ?? null,
      userId: partner.userId?.toString() ?? null,
      accountStatus: partner.accountStatus ?? "inactive",
      createdAt: partner.createdAt,
    };
  },
};
