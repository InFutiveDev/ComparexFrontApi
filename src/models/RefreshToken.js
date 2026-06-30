import crypto from "crypto";
import { ObjectId } from "mongodb";
import { REFRESH_TOKEN_EXPIRES_DAYS } from "../config/jwt.js";
import { getDb } from "../mongo.js";

const COLLECTION = "refresh_tokens";

function tokens() {
  return getDb().collection(COLLECTION);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const RefreshToken = {
  async create(userId) {
    const token = crypto.randomBytes(40).toString("hex");
    const tokenHash = hashToken(token);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    await tokens().insertOne({
      userId: new ObjectId(userId),
      tokenHash,
      expiresAt,
      createdAt: now,
    });

    return { token, expiresAt };
  },

  findValid(token) {
    const tokenHash = hashToken(token);
    return tokens().findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });
  },

  revoke(token) {
    const tokenHash = hashToken(token);
    return tokens().deleteOne({ tokenHash });
  },
};
