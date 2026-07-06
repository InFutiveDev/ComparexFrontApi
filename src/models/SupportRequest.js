import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "support_requests";

function requests() {
  return getDb().collection(COLLECTION);
}

export const SupportRequest = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await requests().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({ page = 1, limit = 50 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      requests()
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      requests().countDocuments({}),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  async deleteById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, deleted: false };
    }

    const result = await requests().deleteOne({ _id: objectId });
    return { invalid: false, deleted: result.deletedCount > 0 };
  },

  sanitize(request) {
    return {
      id: request._id.toString(),
      businessName: request.businessName,
      contactNumber: request.contactNumber,
      businessEmail: request.businessEmail,
      website: request.website ?? null,
      paymentGateway: request.paymentGateway,
      issueCategory: request.issueCategory,
      issueDescription: request.issueDescription,
      disclaimerAccepted: request.disclaimerAccepted,
      attachments: request.attachments ?? [],
      source: request.source ?? null,
      createdAt: request.createdAt,
    };
  },
};
