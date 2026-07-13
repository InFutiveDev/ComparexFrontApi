import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "notifications";

function notifications() {
  return getDb().collection(COLLECTION);
}

export const Notification = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      status: data.status ?? "pending",
      createdAt: now,
      updatedAt: now,
    };

    const result = await notifications().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findByRecipient({ recipientType, recipientId, page = 1, limit = 50 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;
    const filter = {};

    if (recipientType) filter.recipientType = recipientType;
    if (recipientId) {
      const objectId = parseObjectId(recipientId);
      if (objectId) filter.recipientId = objectId;
    }

    const [items, total] = await Promise.all([
      notifications()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      notifications().countDocuments(filter),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  sanitize(notification) {
    return {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      recipientType: notification.recipientType,
      recipientId: notification.recipientId?.toString() ?? null,
      recipientEmail: notification.recipientEmail ?? null,
      leadId: notification.leadId?.toString() ?? null,
      status: notification.status,
      meta: notification.meta ?? {},
      createdAt: notification.createdAt,
    };
  },
};
