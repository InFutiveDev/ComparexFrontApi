import { ObjectId } from "mongodb";
import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "users";

function users() {
  return getDb().collection(COLLECTION);
}

export const User = {
  findByEmail(email) {
    return users().findOne({ email });
  },

  findById(id) {
    return users().findOne({ _id: new ObjectId(id) });
  },

  findByIds(ids) {
    const objectIds = ids
      .map((id) => parseObjectId(id))
      .filter(Boolean);

    if (objectIds.length === 0) {
      return Promise.resolve([]);
    }

    return users()
      .find({ _id: { $in: objectIds } })
      .toArray();
  },

  findByRole(role) {
    return users().find({ role, status: { $ne: "inactive" } }).toArray();
  },

  async create({ name, email, passwordHash, role = "user", status = "inactive" }) {
    const now = new Date();
    const doc = {
      name,
      email,
      passwordHash,
      role,
      status,
      createdAt: now,
      updatedAt: now,
    };

    const result = await users().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async updateStatus(id, status) {
    const objectId = parseObjectId(id);

    if (!objectId) {
      return { updated: false };
    }

    const result = await users().updateOne(
      { _id: objectId },
      { $set: { status, updatedAt: new Date() } },
    );

    return { updated: result.matchedCount > 0 };
  },

  async findAll({ page = 1, limit = 50, role, status, search } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;
    const filter = {};

    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search?.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      users().find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).toArray(),
      users().countDocuments(filter),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
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

    const result = await users().findOneAndUpdate(
      { _id: objectId },
      { $set: updates },
      { returnDocument: "after" },
    );

    if (!result) {
      return { invalid: false, updated: null };
    }

    return { invalid: false, updated: result };
  },

  sanitize(user) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role ?? "user",
      status: user.status ?? "inactive",
      createdAt: user.createdAt,
    };
  },
};
