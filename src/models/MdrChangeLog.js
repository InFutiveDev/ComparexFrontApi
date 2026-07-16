import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "mdr_change_logs";

function logs() {
  return getDb().collection(COLLECTION);
}

export const MdrChangeLog = {
  async create({
    scope,
    action,
    message,
    entityId = null,
    paymentProviderId = null,
    before = null,
    after = null,
    actor = null,
  }) {
    const now = new Date();
    const doc = {
      scope: scope || "global",
      action: action || "update",
      message: message || "MDR settings updated",
      entityId,
      paymentProviderId: paymentProviderId
        ? parseObjectId(paymentProviderId) || paymentProviderId
        : null,
      before,
      after,
      actorId: actor?._id?.toString?.() ?? actor?.id ?? null,
      actorName: actor?.name ?? null,
      actorEmail: actor?.email ?? null,
      actorRole: actor?.role ?? null,
      createdAt: now,
    };

    const result = await logs().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({ page = 1, limit = 50, scope } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;
    const filter = {};
    if (scope) filter.scope = scope;

    const [items, total] = await Promise.all([
      logs().find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).toArray(),
      logs().countDocuments(filter),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  sanitize(entry) {
    return {
      id: entry._id.toString(),
      scope: entry.scope,
      action: entry.action,
      message: entry.message,
      entityId: entry.entityId ?? null,
      paymentProviderId:
        entry.paymentProviderId?.toString?.() ?? entry.paymentProviderId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      actorId: entry.actorId ?? null,
      actorName: entry.actorName ?? null,
      actorEmail: entry.actorEmail ?? null,
      actorRole: entry.actorRole ?? null,
      createdAt: entry.createdAt,
    };
  },
};
