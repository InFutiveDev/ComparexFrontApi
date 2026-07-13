import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "pg_expert_representatives";

function representatives() {
  return getDb().collection(COLLECTION);
}

function buildFilter({ pgDomain, search, status } = {}) {
  const filter = {};

  if (pgDomain) {
    filter.pgDomain = { $regex: `^${pgDomain.trim()}$`, $options: "i" };
  }

  if (status) {
    filter.status = status;
  }

  if (search?.trim()) {
    const q = search.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
      { pgDomain: { $regex: q, $options: "i" } },
    ];
  }

  return filter;
}

export const PgExpertRepresentative = {
  async create(data) {
    const now = new Date();
    const doc = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      pgDomain: data.pgDomain,
      title: data.title ?? null,
      status: data.status ?? "active",
      paymentProviderId: data.paymentProviderId ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await representatives().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findAll({ page = 1, limit = 50, pgDomain, search, status } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;
    const filter = buildFilter({ pgDomain, search, status });

    const [items, total] = await Promise.all([
      representatives()
        .find(filter)
        .sort({ pgDomain: 1, name: 1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      representatives().countDocuments(filter),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  },

  findById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) return null;
    return representatives().findOne({ _id: objectId });
  },

  findByEmail(email) {
    return representatives().findOne({ email: email.trim().toLowerCase() });
  },

  async findByPgDomain(pgDomain) {
    return representatives()
      .find({
        pgDomain: { $regex: `^${pgDomain.trim()}$`, $options: "i" },
        status: "active",
      })
      .sort({ name: 1 })
      .toArray();
  },

  async updateById(id, data) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, updated: null };
    }

    const result = await representatives().findOneAndUpdate(
      { _id: objectId },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!result) {
      return { invalid: false, updated: null };
    }

    return { invalid: false, updated: result };
  },

  async deleteById(id) {
    const objectId = parseObjectId(id);
    if (!objectId) {
      return { invalid: true, deleted: false };
    }

    const result = await representatives().deleteOne({ _id: objectId });
    return { invalid: false, deleted: result.deletedCount > 0 };
  },

  sanitize(rep) {
    return {
      id: rep._id.toString(),
      name: rep.name,
      email: rep.email,
      phone: rep.phone,
      pgDomain: rep.pgDomain,
      title: rep.title ?? null,
      status: rep.status ?? "active",
      paymentProviderId: rep.paymentProviderId?.toString() ?? null,
      notes: rep.notes ?? null,
      createdAt: rep.createdAt,
      updatedAt: rep.updatedAt ?? null,
    };
  },
};
