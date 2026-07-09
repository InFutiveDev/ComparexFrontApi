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
