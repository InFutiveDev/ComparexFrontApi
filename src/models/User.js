import { ObjectId } from "mongodb";
import { getDb } from "../mongo.js";

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

  async create({ name, email, passwordHash }) {
    const now = new Date();
    const doc = {
      name,
      email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const result = await users().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  sanitize(user) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  },
};
