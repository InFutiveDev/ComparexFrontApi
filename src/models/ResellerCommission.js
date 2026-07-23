import { getDb } from "../mongo.js";
import { COMMISSION_STATUSES } from "../constants/resellerFinance.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "reseller_commissions";

function commissions() {
  return getDb().collection(COLLECTION);
}

export const ResellerCommission = {
  async create(data) {
    const now = new Date();
    const doc = {
      status: COMMISSION_STATUSES.PENDING,
      currency: "INR",
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const result = await commissions().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findForReseller(
    resellerId,
    { status, from, to, merchantLeadId, page = 1, limit = 50 } = {},
  ) {
    const partnerId = parseObjectId(resellerId);
    if (!partnerId) return { items: [], total: 0, page: 1, limit: 50, stats: {} };

    const filter = { resellerId: partnerId };
    if (status) filter.status = status;
    if (merchantLeadId) filter.merchantLeadId = parseObjectId(merchantLeadId);
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [items, total, statsAgg] = await Promise.all([
      commissions().find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).toArray(),
      commissions().countDocuments(filter),
      commissions()
        .aggregate([
          { $match: { resellerId: partnerId } },
          {
            $group: {
              _id: "$status",
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const stats = { pending: 0, approved: 0, paid: 0, total: 0 };
    for (const row of statsAgg) {
      stats[row._id] = row.total;
      stats.total += row.total;
    }

    return { items, total, page: safePage, limit: safeLimit, stats };
  },

  async existsForSlabAndLead(resellerId, merchantLeadId, rateSlabId, gmvRecordId) {
    const filter = {
      resellerId: parseObjectId(resellerId),
      merchantLeadId: parseObjectId(merchantLeadId),
      rateSlabId,
    };
    if (gmvRecordId) {
      filter.gmvRecordId = parseObjectId(gmvRecordId);
    }
    const count = await commissions().countDocuments(filter);
    return count > 0;
  },

  sanitize(commission) {
    return {
      id: commission._id.toString(),
      resellerId: commission.resellerId?.toString?.() ?? null,
      merchantLeadId: commission.merchantLeadId?.toString?.() ?? null,
      merchantName: commission.merchantName ?? null,
      gmvRecordId: commission.gmvRecordId?.toString?.() ?? null,
      amount: commission.amount,
      currency: commission.currency ?? "INR",
      rateSlabId: commission.rateSlabId,
      rateSlabName: commission.rateSlabName,
      rateType: commission.rateType ?? null,
      rateValue: commission.rateValue ?? null,
      status: commission.status,
      periodStart: commission.periodStart ?? null,
      periodEnd: commission.periodEnd ?? null,
      approvedAt: commission.approvedAt ?? null,
      paidAt: commission.paidAt ?? null,
      createdAt: commission.createdAt,
    };
  },
};
