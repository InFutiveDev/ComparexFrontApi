import { ObjectId } from "mongodb";
import { getDb } from "../mongo.js";
import { parseObjectId } from "../utils/objectId.js";

const COLLECTION = "lead_activities";

function activities() {
  return getDb().collection(COLLECTION);
}

export const LeadActivity = {
  async create({
    leadId,
    type,
    message,
    actorId = null,
    actorName = null,
    actorRole = null,
    meta = {},
  }) {
    const now = new Date();
    const doc = {
      leadId: parseObjectId(leadId) || leadId,
      type,
      message,
      actorId: actorId ? parseObjectId(actorId) || actorId : null,
      actorName,
      actorRole,
      meta,
      createdAt: now,
    };

    const result = await activities().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async findByLeadId(leadId) {
    const objectId = parseObjectId(leadId);
    if (!objectId) {
      return [];
    }

    return activities()
      .find({ leadId: objectId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  sanitize(activity) {
    return {
      id: activity._id.toString(),
      leadId: activity.leadId?.toString?.() ?? String(activity.leadId),
      type: activity.type,
      message: activity.message,
      actorId: activity.actorId?.toString?.() ?? null,
      actorName: activity.actorName ?? null,
      actorRole: activity.actorRole ?? null,
      meta: activity.meta ?? {},
      createdAt: activity.createdAt,
    };
  },
};
