import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "expert_bookings";

function bookings() {
  return getDb().collection(COLLECTION);
}

export const ExpertBooking = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await bookings().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({ page = 1, limit = 50 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      bookings()
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      bookings().countDocuments({}),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  findById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) return null;
    return bookings().findOne({ _id: objectId });
  },

  async deleteById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, deleted: false };
    }

    const result = await bookings().deleteOne({ _id: objectId });
    return { invalid: false, deleted: result.deletedCount > 0 };
  },

  async updateById(id, data) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, updated: null };
    }

    const result = await bookings().findOneAndUpdate(
      { _id: objectId },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!result) {
      return { invalid: false, updated: null };
    }

    return { invalid: false, updated: result };
  },

  sanitize(booking) {
    return {
      id: booking._id.toString(),
      fullName: booking.fullName,
      businessName: booking.businessName,
      email: booking.email,
      phone: booking.phone,
      website: booking.website || "",
      industry: booking.industry ?? null,
      priority: booking.priority ?? null,
      paymentGatewayId: booking.paymentGatewayId ?? null,
      paymentGatewayName: booking.paymentGatewayName ?? null,
      merchantLeadId: booking.merchantLeadId?.toString?.() ?? booking.merchantLeadId ?? null,
      representativeName: booking.representativeName ?? null,
      representativeTitle: booking.representativeTitle ?? null,
      slotId: booking.slotId ?? null,
      slotDateLabel: booking.slotDateLabel ?? null,
      slotTime: booking.slotTime ?? null,
      calendlyEventUri: booking.calendlyEventUri ?? null,
      calendlyInviteeUri: booking.calendlyInviteeUri ?? null,
      scheduledAt: booking.scheduledAt ?? null,
      bookingSource: booking.bookingSource ?? "manual",
      status: booking.status ?? "new",
      source: booking.source ?? "talk-to-expert",
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt ?? null,
    };
  },
};
