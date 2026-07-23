import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "reseller_gmv_records";

function records() {
  return getDb().collection(COLLECTION);
}

export const ResellerGmvRecord = {
  async create(data) {
    const now = new Date();
    const doc = {
      currency: "INR",
      source: "lead_sync",
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const result = await records().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findForReseller(
    resellerId,
    { from, to, merchantLeadId, page = 1, limit = 50 } = {},
  ) {
    const partnerId = parseObjectId(resellerId);
    if (!partnerId) return { items: [], total: 0, page: 1, limit: 50, totalGmv: 0 };

    const filter = { resellerId: partnerId };
    if (merchantLeadId) {
      filter.merchantLeadId = parseObjectId(merchantLeadId);
    }
    if (from || to) {
      filter.recordedAt = {};
      if (from) filter.recordedAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.recordedAt.$lte = end;
      }
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total, agg] = await Promise.all([
      records().find(filter).sort({ recordedAt: -1 }).skip(skip).limit(safeLimit).toArray(),
      records().countDocuments(filter),
      records()
        .aggregate([{ $match: filter }, { $group: { _id: null, totalGmv: { $sum: "$amount" } } }])
        .toArray(),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalGmv: agg[0]?.totalGmv ?? 0,
    };
  },

  async existsForLeadPeriod(resellerId, merchantLeadId, periodStart, periodEnd) {
    const count = await records().countDocuments({
      resellerId: parseObjectId(resellerId),
      merchantLeadId: parseObjectId(merchantLeadId),
      periodStart,
      periodEnd,
    });
    return count > 0;
  },

  async listMerchantsForReseller(resellerId) {
    return records()
      .aggregate([
        { $match: { resellerId: parseObjectId(resellerId) } },
        {
          $group: {
            _id: "$merchantLeadId",
            merchantName: { $last: "$merchantName" },
            totalGmv: { $sum: "$amount" },
          },
        },
        { $sort: { merchantName: 1 } },
      ])
      .toArray();
  },

  sanitize(record) {
    return {
      id: record._id.toString(),
      resellerId: record.resellerId?.toString?.() ?? null,
      merchantLeadId: record.merchantLeadId?.toString?.() ?? null,
      merchantName: record.merchantName,
      amount: record.amount,
      currency: record.currency ?? "INR",
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      source: record.source ?? "lead_sync",
      recordedAt: record.recordedAt,
      createdAt: record.createdAt,
    };
  },
};
