import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";
import { LEAD_STATUSES, PG_LEAD_STATUSES } from "../constants/leadWorkflow.js";

const COLLECTION = "merchant_leads";

function leads() {
  return getDb().collection(COLLECTION);
}

function buildFilter({
  status,
  industry,
  location,
  assignedPgId,
  search,
} = {}) {
  const filter = {};

  if (status) {
    filter.leadStatus = status;
  }

  if (industry) {
    filter.industry = industry;
  }

  if (location) {
    filter.location = { $regex: location.trim(), $options: "i" };
  }

  if (assignedPgId) {
    const objectId = parseObjectId(assignedPgId);
    if (objectId) {
      filter.assignedPgId = objectId;
    }
  }

  if (search?.trim()) {
    const q = search.trim();
    filter.$or = [
      { businessName: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
    ];
  }

  return filter;
}

export const MerchantLead = {
  async create(data) {
    const now = new Date();
    const doc = {
      leadStatus: LEAD_STATUSES.NEW,
      location: data.location ?? null,
      assignedPgId: null,
      assignedPgName: null,
      assignedAt: null,
      assignedBy: null,
      registeredViaPgId: null,
      registeredViaResellerId: null,
      referredByResellerName: null,
      pgLeadStatus: PG_LEAD_STATUSES.PENDING,
      pgRemarks: null,
      pgStatusUpdatedAt: null,
      pgStatusUpdatedBy: null,
      expertBookingId: null,
      qualificationNotes: null,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await leads().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({
    page = 1,
    limit = 50,
    status,
    industry,
    location,
    assignedPgId,
    search,
  } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;
    const filter = buildFilter({ status, industry, location, assignedPgId, search });

    const [items, total] = await Promise.all([
      leads()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      leads().countDocuments(filter),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  async findAllForPg(
    pgId,
    { page = 1, limit = 50, pgLeadStatus, source, search, exportAll = false } = {},
  ) {
    const objectId = parseObjectId(pgId);
    if (!objectId) return { items: [], total: 0, page: 1, limit: Number(limit) || 50 };

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = exportAll
      ? 10000
      : Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = exportAll ? 0 : (safePage - 1) * safeLimit;
    const filter = {
      $and: [
        {
          $or: [
            { assignedPgId: objectId },
            { registeredViaPgId: objectId },
          ],
        },
      ],
    };

    if (pgLeadStatus === PG_LEAD_STATUSES.PENDING) {
      filter.$and.push({
        $or: [
          { pgLeadStatus: PG_LEAD_STATUSES.PENDING },
          { pgLeadStatus: { $exists: false } },
          { pgLeadStatus: null },
        ],
      });
    } else if (pgLeadStatus) {
      filter.pgLeadStatus = pgLeadStatus;
    }
    if (source) filter.source = source;
    if (search?.trim()) {
      const q = search.trim();
      filter.$and.push({
        $or: [
          { businessName: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
        ],
      });
    }

    const [items, total] = await Promise.all([
      leads()
        .find(filter)
        .sort({ assignedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      leads().countDocuments(filter),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  async findAllForReseller(
    resellerId,
    { page = 1, limit = 50, leadStatus, search, exportAll = false } = {},
  ) {
    const objectId = parseObjectId(resellerId);
    if (!objectId) return { items: [], total: 0, page: 1, limit: Number(limit) || 50 };

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = exportAll
      ? 10000
      : Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = exportAll ? 0 : (safePage - 1) * safeLimit;
    const filter = {
      registeredViaResellerId: objectId,
    };

    if (leadStatus) {
      filter.leadStatus = leadStatus;
    }

    if (search?.trim()) {
      const q = search.trim();
      filter.$or = [
        { businessName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      leads()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      leads().countDocuments(filter),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  async findByIdForReseller(id, resellerId) {
    const leadId = parseObjectId(id);
    const partnerId = parseObjectId(resellerId);
    if (!leadId || !partnerId) return null;

    return leads().findOne({
      _id: leadId,
      registeredViaResellerId: partnerId,
    });
  },

  async findByIdForPg(id, pgId) {
    const leadId = parseObjectId(id);
    const providerId = parseObjectId(pgId);
    if (!leadId || !providerId) return null;

    return leads().findOne({
      _id: leadId,
      $or: [
        { assignedPgId: providerId },
        { registeredViaPgId: providerId },
      ],
    });
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
      contactName: lead.contactName ?? null,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry ?? null,
      merchantCategory: lead.merchantCategory ?? lead.industry ?? null,
      estimatedMonthlyVolume: lead.estimatedMonthlyVolume ?? null,
      priority: lead.priority ?? null,
      location: lead.location ?? null,
      leadStatus: lead.leadStatus ?? LEAD_STATUSES.NEW,
      qualificationNotes: lead.qualificationNotes ?? null,
      assignedPgId: lead.assignedPgId?.toString() ?? null,
      assignedPgName: lead.assignedPgName ?? null,
      assignedAt: lead.assignedAt ?? null,
      assignedBy: lead.assignedBy?.toString() ?? null,
      registeredViaPgId: lead.registeredViaPgId?.toString?.() ?? null,
      registeredViaResellerId: lead.registeredViaResellerId?.toString?.() ?? null,
      referredByResellerName: lead.referredByResellerName ?? null,
      pgLeadStatus: lead.pgLeadStatus ?? PG_LEAD_STATUSES.PENDING,
      pgRemarks: lead.pgRemarks ?? null,
      pgStatusUpdatedAt: lead.pgStatusUpdatedAt ?? null,
      pgStatusUpdatedBy: lead.pgStatusUpdatedBy?.toString?.() ?? null,
      expertBookingId: lead.expertBookingId?.toString() ?? null,
      formStep: lead.formStep ?? 1,
      source: lead.source ?? null,
      userId: lead.userId?.toString() ?? null,
      accountStatus: lead.accountStatus ?? "inactive",
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt ?? null,
    };
  },
};
