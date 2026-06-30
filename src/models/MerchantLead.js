import { getDb } from "../mongo.js";

const COLLECTION = "merchant_leads";

function leads() {
  return getDb().collection(COLLECTION);
}

export const MerchantLead = {
  async create(data) {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await leads().insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  sanitize(lead) {
    return {
      id: lead._id.toString(),
      businessName: lead.businessName,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      priority: lead.priority,
      createdAt: lead.createdAt,
    };
  },
};
